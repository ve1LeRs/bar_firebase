#!/usr/bin/env bash
# DEPRECATED / SAFETY: do NOT map asafievbar onto stream :443 — that is VPN SNI mux.
# Bar API lives on https://asafievbar.duckdns.org:2083
set -euo pipefail
CONF=/etc/nginx/nginx.conf
if grep -q 'asafievbar.duckdns.org' "$CONF"; then
  echo "WARN: asafievbar still referenced in nginx.conf — remove from stream SNI map"
  exit 1
fi
echo "ok: no asafievbar on stream :443"
