#!/usr/bin/env bash
# Idempotent: map asafievbar.duckdns.org SNI on :443 → local bar TLS :8443.
# Does NOT modify max.ru Reality or myvpnrus routes.
set -euo pipefail
CONF=/etc/nginx/nginx.conf
if grep -q 'asafievbar.duckdns.org[[:space:]]\+127.0.0.1:8443' "$CONF"; then
  echo "already mapped"
  exit 0
fi
python3 - "$CONF" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text()
needle = '        myvpnrus.duckdns.org   10.77.0.1:443;\n'
insert = needle + (
    '        # Mini App / bar API on standard HTTPS (SNI)\n'
    '        asafievbar.duckdns.org 127.0.0.1:8443;\n'
)
if needle not in text:
    raise SystemExit('anchor not found')
p.write_text(text.replace(needle, insert, 1))
print('patched')
PY
nginx -t && nginx -s reload
