#!/usr/bin/env bash
# Security posture checks for the Jedana monorepo.
# Usage: scripts/verify-security.sh [--strict|--report]
# In S2, default is strict (exit 1 if blocking advisories present).
# Non-blocking findings for future phases (S3-S6) are labeled PENDING.
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
PENDING=0

pass() { echo "PASS  $1"; }
fail_hard() { echo "FAIL  $1${2:+ — $2}"; HARD_FAILED=$((HARD_FAILED + 1)); }
pending() { local phase="$1" msg="$2" det="${3:-}"; echo "PENDING $phase  $msg${det:+ — $det}"; PENDING=$((PENDING + 1)); }

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
  pending "S3" "code falls back to a public JWT secret" "apps/server/src"
else
  pass "no public JWT secret fallback in code"
fi

if grep -q "change_this_secret_in_production" docker-compose.yml; then
  pending "S3" "docker-compose ships a default JWT_SECRET" "docker-compose.yml"
else
  pass "docker-compose has no default JWT_SECRET"
fi

if grep -q "JWT_SECRET:?\|JWT_SECRET:\${JWT_SECRET:" docker-compose.yml; then
  pass "docker-compose requires JWT_SECRET"
else
  pending "S3" "docker-compose does not require JWT_SECRET"
fi

echo "== container hardening =="
if grep -qE "^USER " apps/server/Dockerfile; then
  pass "server image declares USER"
else
  pending "S6" "server image runs as root (no USER)"
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
  pending "S6" "server service publishes ports"
fi

echo "== origin headers (nginx.conf) =="
for h in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options\|frame-ancestors" \
         "Referrer-Policy" "Content-Security-Policy"; do
  if grep -qE "$h" nginx.conf; then
    pass "nginx sends ${h//\\|/ /}"
  else
    pending "S6" "nginx missing header" "$h"
  fi
done

echo "== client identity & rate limiting =="
if grep -rq "getClientIp" apps/server/src; then
  pass "client IP helper exists"
else
  pending "S5" "no client IP helper (rate limit keys are wrong behind a proxy)"
fi

if grep -rqi "rate.*limit" apps/server/src/mcp; then
  pass "MCP endpoint has its own rate limit"
else
  pending "S5" "MCP endpoint has no rate limit"
fi

echo
if [ "$HARD_FAILED" -eq 0 ]; then
  if [ "$PENDING" -gt 0 ]; then
    echo "== security: S2 gate passed (0 critical/high advisories, $PENDING pending check(s) for S3-S6) =="
  else
    echo "== security: all checks pass =="
  fi
  exit 0
fi

echo "== security: $HARD_FAILED check(s) failed =="
[ "$STRICT" -eq 1 ] && exit 1
echo "(report mode: exit 0 — run without --report to enforce gate)"
exit 0
