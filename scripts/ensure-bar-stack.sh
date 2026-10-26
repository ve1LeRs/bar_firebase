#!/bin/bash
set -euo pipefail
/root/nginx-keepalive.sh

XCONF=/usr/local/etc/xray/config.json
if [[ -f "$XCONF" ]]; then
  python3 - "$XCONF" <<'PY'
import json, sys, os, tempfile, socket
path = sys.argv[1]
with open(path) as f:
    c = json.load(f)
changed = False
inbounds = c.get("inbounds") or []
if not any(ib.get("tag") == "http-local" or ib.get("port") == 18080 for ib in inbounds):
    inbounds.append({
        "tag": "http-local",
        "listen": "127.0.0.1",
        "port": 18080,
        "protocol": "http",
        "settings": {"allowTransparent": False},
        "sniffing": {"enabled": True, "destOverride": ["http", "tls"]},
    })
    c["inbounds"] = inbounds
    changed = True
routing = c.get("routing") or {}
rules = routing.get("rules") or []
has = any(
    (isinstance(r.get("inboundTag"), list) and "http-local" in r.get("inboundTag", []))
    or r.get("inboundTag") == "http-local"
    for r in rules
)
if not has:
    rules.insert(0, {"type": "field", "inboundTag": ["http-local"], "outboundTag": "london"})
    routing["rules"] = rules
    c["routing"] = routing
    changed = True
if changed:
    fd, tmp = tempfile.mkstemp(prefix="xray-", suffix=".json")
    with os.fdopen(fd, "w") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)
    print("xray config patched")
    os.system("systemctl restart xray")
else:
    s = socket.socket()
    try:
        s.settimeout(0.3)
        s.connect(("127.0.0.1", 18080))
        s.close()
    except Exception:
        print("http-local missing listener; restart xray")
        os.system("systemctl restart xray")
PY
fi

if command -v pm2 >/dev/null; then
  pm2 describe bar-firebase >/dev/null 2>&1 || pm2 start /root/bar_firebase/webhook-server.js --name bar-firebase --cwd /root/bar_firebase
fi
