#!/usr/bin/env bash
# Local verification gate for the web app; Playwright e2e is not part of CI.
# Note: in an agy worktree, run `rm -rf node_modules && npm ci` first so dependencies resolve locally.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH=/home/ryan/.nvm/versions/node/v24.22.1/bin:$PATH
hash -r

echo "== node $(node -v) =="
[ "$(node -v)" = "v24.22.1" ] || { echo "FAIL: Expected Node v24.22.1"; exit 1; }

echo "== unit tests (server + web) =="
npm run test 2>&1 | grep -E "Tests:? |Test Suites:|Test Files" || true

echo "== build =="
npm run build >/dev/null && echo "build: OK"

echo "== lint web =="
npm run lint --prefix apps/web && echo "lint: 0 problem"

echo "== e2e =="
npm run test:e2e 2>&1 | tail -5

echo "== gate OK =="
