#!/bin/bash
set -euo pipefail
LOG=/var/log/nginx-keepalive.log
ts() { date -Is; }

start_nginx() {
  # Prefer systemd; if RefuseManualStart blocks us, start binary directly
  if systemctl start nginx 2>>"$LOG"; then
    return 0
  fi
  if [[ -f /run/nginx.pid ]] && kill -0 "$(cat /run/nginx.pid)" 2>/dev/null; then
    return 0
  fi
  /usr/sbin/nginx -t >>"$LOG" 2>&1 && /usr/sbin/nginx >>"$LOG" 2>&1 || true
}

if ! systemctl is-active --quiet nginx; then
  echo "$(ts) nginx inactive — starting" >>"$LOG"
  start_nginx
fi
if ! ss -tlnH | grep -q ':8443 '; then
  echo "$(ts) :8443 not listening — restart/start nginx" >>"$LOG"
  systemctl restart nginx 2>>"$LOG" || start_nginx
fi
