#!/usr/bin/env bash
# Security posture checks for the Jedana monorepo.
# Usage: scripts/verify-security.sh [--strict]
set -uo pipefail

cd "$(dirname "$0")/.."
STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
FAILED=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1${2:+ — $2}"; FAILED=$((FAILED + 1)); }

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
[ "$CRIT" = "0" ] && [ "$HIGH" = "0" ] && pass "no critical/high advisories" \
  || fail "critical/high advisories present" "$CRIT critical, $HIGH high"

echo "== secret handling =="
grep -rq "fallback-secret" apps/server/src \
  && fail "code falls back to a public JWT secret" "apps/server/src" \
  || pass "no public JWT secret fallback in code"

grep -q "change_this_secret_in_production" docker-compose.yml \
  && fail "docker-compose ships a default JWT_SECRET" "docker-compose.yml" \
  || pass "docker-compose has no default JWT_SECRET"

if grep -q "JWT_SECRET:?\|JWT_SECRET:\${JWT_SECRET:" docker-compose.yml; then
  pass "docker-compose requires JWT_SECRET"
else
  fail "docker-compose does not require JWT_SECRET"
fi

echo "== container hardening =="
grep -qE "^USER " apps/server/Dockerfile \
  && pass "server image declares USER" \
  || fail "server image runs as root (no USER)"

grep -q "ports:" -A3 docker-compose.yml && \
  python3 - <<'PY' || true
import re,sys
text=open('docker-compose.yml').read()
# server service must not publish ports
m=re.search(r'  server:\n(.*?)(?:\n  \w|\nnetworks:)', text, re.S)
if m and 'ports:' in m.group(1):
    print('FAIL  server service publishes ports'); sys.exit(1)
print('PASS  server service publishes no ports')
PY

echo "== origin headers (nginx.conf) =="
for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options\|frame-ancestors" \
         "Referrer-Policy" "Content-Security-Policy"; do
  grep -qE "$h" nginx.conf && pass "nginx sends ${h//\\|/ /}" \
    || fail "nginx missing header" "$h"
done

echo "== client identity & rate limiting =="
grep -rq "getClientIp" apps/server/src \
  && pass "client IP helper exists" \
  || fail "no client IP helper (rate limit keys are wrong behind a proxy)"
grep -rqi "rate.*limit" apps/server/src/mcp \
  && pass "MCP endpoint has its own rate limit" \
  || fail "MCP endpoint has no rate limit"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "== security: all checks pass =="
  exit 0
fi
echo "== security: $FAILED check(s) failed =="
[ "$STRICT" -eq 1 ] && exit 1
echo "(report mode: exit 0 — pass --strict to fail the build)"
exit 0
