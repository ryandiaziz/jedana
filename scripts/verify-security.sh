#!/usr/bin/env bash
# Security posture checks for the Jedana monorepo.
# Usage: scripts/verify-security.sh [--strict|--report]
# In S6, default is strict (exit 1 if any check fails).
# Non-blocking inspection can be done with --report.
set -uo pipefail

cd "$(dirname "$0")/.."
STRICT=1
for arg in "$@"; do
  case "$arg" in
    --report) STRICT=0 ;;
    --strict) STRICT=1 ;;
  esac
done

HARD_FAILED=0

pass() { echo "PASS  $1"; }
fail_hard() { echo "FAIL  $1${2:+ — $2}"; HARD_FAILED=$((HARD_FAILED + 1)); }

echo "== dependency advisories =="
AUDIT_JSON=$(npm audit --json 2>/dev/null || true)
COUNTS=$(printf '%s' "$AUDIT_JSON" | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("unknown"); raise SystemExit
v=d.get("metadata",{}).get("vulnerabilities",{})
print("%s %s %s %s" % (v.get("critical",0), v.get("high",0), v.get("moderate",0), v.get("low",0)))
')
CRIT=$(echo "$COUNTS" | cut -d' ' -f1)
HIGH=$(echo "$COUNTS" | cut -d' ' -f2)
echo "      critical=$CRIT high=$HIGH (total: $COUNTS)"
if [ "$CRIT" = "0" ] && [ "$HIGH" = "0" ]; then
  pass "no critical/high advisories"
else
  fail_hard "critical/high advisories present" "$CRIT critical, $HIGH high"
fi

echo "== secret handling =="
if grep -rq "fallback-secret" apps/server/src; then
  fail_hard "code falls back to a public JWT secret" "apps/server/src"
else
  pass "no public JWT secret fallback in code"
fi

if grep -q "change_this_secret_in_production" docker-compose.yml; then
  fail_hard "docker-compose ships a default JWT_SECRET" "docker-compose.yml"
else
  pass "docker-compose has no default JWT_SECRET"
fi

if grep -q "JWT_SECRET:?\|JWT_SECRET:\${JWT_SECRET:" docker-compose.yml; then
  pass "docker-compose requires JWT_SECRET"
else
  fail_hard "docker-compose does not require JWT_SECRET"
fi

echo "== container hardening =="
if grep -qE "^USER " apps/server/Dockerfile; then
  pass "server image declares USER"
else
  fail_hard "server image runs as root (no USER)"
fi

if python3 -c "
import re,sys
text=open('docker-compose.yml').read()
m=re.search(r'  server:\n(.*?)(?:\n  \w|\nnetworks:)', text, re.S)
if m and 'ports:' in m.group(1):
    sys.exit(1)
"; then
  pass "server service publishes no ports"
else
  fail_hard "server service publishes ports"
fi

echo "== origin headers (deploy/nginx/jedana.my.id.conf) =="
NGINX_CONF="deploy/nginx/jedana.my.id.conf"
if [ ! -f "$NGINX_CONF" ]; then
  fail_hard "host nginx template missing" "$NGINX_CONF"
else
  for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options|frame-ancestors" \
           "Referrer-Policy" "Content-Security-Policy"; do
    if grep -qE "$h" "$NGINX_CONF"; then
      pass "host nginx sends ${h//|/ }"
    else
      fail_hard "host nginx missing header" "$h"
    fi
  done

  CSP_CHECK=$(python3 -c "
import base64, hashlib, re, pathlib, sys
try:
    html = pathlib.Path('apps/web/index.html').read_text()
    m_script = re.search(r'<script>(.*?)</script>', html, re.S)
    if not m_script:
        sys.exit(1)
    expected_hash = base64.b64encode(hashlib.sha256(m_script.group(1).encode()).digest()).decode()

    conf_path = pathlib.Path('$NGINX_CONF')
    if not conf_path.exists():
        sys.exit(2)
    conf = conf_path.read_text()
    m_csp = re.search(r\"Content-Security-Policy.*?'sha256-([^']+)'\", conf)
    if not m_csp:
        sys.exit(3)
    found_hash = m_csp.group(1)
    if expected_hash != found_hash:
        sys.exit(4)
    print(found_hash)
except Exception:
    sys.exit(5)
" 2>&1)
  CSP_STATUS=$?
  if [ $CSP_STATUS -eq 0 ]; then
    pass "CSP inline script hash matches apps/web/index.html ('sha256-$CSP_CHECK')"
  else
    fail_hard "CSP hash is stale, recompute it"
  fi
fi

echo "== client identity & rate limiting =="
if grep -rq "getClientIp" apps/server/src; then
  pass "client IP helper exists"
else
  fail_hard "no client IP helper (rate limit keys are wrong behind a proxy)"
fi

if grep -rqi "rate.*limit" apps/server/src/mcp; then
  pass "MCP endpoint has its own rate limit"
else
  fail_hard "MCP endpoint has no rate limit"
fi

echo
if [ "$HARD_FAILED" -eq 0 ]; then
  echo "== security: all checks pass =="
  exit 0
fi

echo "== security: $HARD_FAILED check(s) failed =="
[ "$STRICT" -eq 1 ] && exit 1
echo "(report mode: exit 0 — run without --report to enforce gate)"
exit 0
