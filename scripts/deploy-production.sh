#!/usr/bin/env bash
# Production deployment script for Jedana (jedana.my.id)
# Usage:
#   ./scripts/deploy-production.sh --check     # Read-only pre-flight checks
#   ./scripts/deploy-production.sh --deploy    # Full deployment with verification
#   ./scripts/deploy-production.sh --rollback  # Manual rollback to previous release
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-jedana}"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

pass() {
  echo "PASS  $1"
}

fail() {
  echo "FAIL  $1"
  CHECK_FAILS=$((CHECK_FAILS + 1))
}

info() {
  echo "INFO  $1"
}

run_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    $SUDO nginx "$@"
  elif [ -x /usr/sbin/nginx ]; then
    $SUDO /usr/sbin/nginx "$@"
  else
    echo "ERROR: nginx binary not found in PATH or /usr/sbin/nginx" >&2
    return 1
  fi
}

run_systemctl_reload_nginx() {
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl reload nginx
  elif command -v service >/dev/null 2>&1; then
    $SUDO service nginx reload
  else
    run_nginx -s reload
  fi
}

get_env_val() {
  local key="$1"
  local env_file="${2:-.env}"
  if [ ! -f "$env_file" ]; then
    return 1
  fi
  local line
  line=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$env_file" 2>/dev/null | tail -n 1 || true)
  if [ -z "$line" ]; then
    return 1
  fi
  local val
  val=$(printf "%s" "$line" | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=[[:space:]]*//")
  if [[ "$val" =~ ^\"([^\"]*)\" ]]; then
    val="${BASH_REMATCH[1]}"
  elif [[ "$val" =~ ^\'([^\']*)\' ]]; then
    val="${BASH_REMATCH[1]}"
  else
    val=$(printf "%s" "$val" | sed -E "s/[[:space:]]*#.*$//" | sed -E "s/[[:space:]]+$//")
  fi
  printf "%s" "$val"
  return 0
}

CHECK_FAILS=0

do_check() {
  CHECK_FAILS=0
  echo "== 1. Checking required tools =="
  for tool in docker nginx curl git; do
    if [ "$tool" = "nginx" ]; then
      if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
        pass "tool '$tool' is available"
      else
        fail "tool '$tool' is missing"
      fi
    elif command -v "$tool" >/dev/null 2>&1; then
      pass "tool '$tool' is available"
    else
      fail "tool '$tool' is missing"
    fi
  done

  if docker compose version >/dev/null 2>&1; then
    pass "tool 'docker compose' is available"
  else
    fail "tool 'docker compose' is missing"
  fi

  echo "== 2. Checking git repository status =="
  if git fetch origin development >/dev/null 2>&1; then
    pass "git fetch origin development succeeded"
  else
    fail "git fetch origin development failed"
  fi

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if [ "$current_branch" = "development" ]; then
    pass "git branch is 'development'"
  else
    fail "git branch is '$current_branch' (expected 'development')"
  fi

  local dirty_status
  dirty_status=$(git status --porcelain 2>/dev/null || echo "")
  if [ -z "$dirty_status" ]; then
    pass "git working directory is clean"
  else
    fail "git working directory has uncommitted changes"
  fi

  local head_commit
  local origin_commit
  head_commit=$(git rev-parse HEAD 2>/dev/null || echo "head_unknown")
  origin_commit=$(git rev-parse origin/development 2>/dev/null || echo "origin_unknown")
  if [ "$head_commit" = "$origin_commit" ]; then
    pass "HEAD matches origin/development ($head_commit)"
  else
    fail "HEAD ($head_commit) does not match origin/development ($origin_commit)"
  fi

  echo "== 3. Checking docker shared network =="
  if docker network inspect shared_net >/dev/null 2>&1; then
    pass "docker network 'shared_net' exists"
  else
    fail "docker network 'shared_net' not found (run: docker network create shared_net)"
  fi

  echo "== 4. Checking .env file and required secrets =="
  if [ ! -f .env ]; then
    fail ".env file is missing in $REPO_ROOT"
  else
    pass ".env file exists"

    # JWT_SECRET: length >= 32
    local jwt_val
    if jwt_val=$(get_env_val "JWT_SECRET"); then
      local jwt_len=${#jwt_val}
      if [ "$jwt_len" -ge 32 ]; then
        pass "JWT_SECRET len=$jwt_len"
      else
        fail "JWT_SECRET len=$jwt_len (< 32 characters)"
      fi
    else
      fail "JWT_SECRET is missing from .env"
    fi

    # GOOGLE_CLIENT_ID: non-empty
    local gcid_val
    if gcid_val=$(get_env_val "GOOGLE_CLIENT_ID"); then
      local gcid_len=${#gcid_val}
      if [ "$gcid_len" -gt 0 ]; then
        pass "GOOGLE_CLIENT_ID len=$gcid_len"
      else
        fail "GOOGLE_CLIENT_ID is empty"
      fi
    else
      fail "GOOGLE_CLIENT_ID is missing from .env"
    fi

    # GOOGLE_CLIENT_SECRET: non-empty
    local gcsec_val
    if gcsec_val=$(get_env_val "GOOGLE_CLIENT_SECRET"); then
      local gcsec_len=${#gcsec_val}
      if [ "$gcsec_len" -gt 0 ]; then
        pass "GOOGLE_CLIENT_SECRET len=$gcsec_len"
      else
        fail "GOOGLE_CLIENT_SECRET is empty"
      fi
    else
      fail "GOOGLE_CLIENT_SECRET is missing from .env"
    fi

    # GOOGLE_CALLBACK_URL: starts with https://
    local cb_val
    if cb_val=$(get_env_val "GOOGLE_CALLBACK_URL"); then
      if [[ "$cb_val" =~ ^https:// ]]; then
        pass "GOOGLE_CALLBACK_URL=$cb_val"
      else
        fail "GOOGLE_CALLBACK_URL must start with https:// (got: $cb_val)"
      fi
    else
      fail "GOOGLE_CALLBACK_URL is missing from .env"
    fi

    # FRONTEND_URL: starts with https://
    local fe_val
    if fe_val=$(get_env_val "FRONTEND_URL"); then
      if [[ "$fe_val" =~ ^https:// ]]; then
        pass "FRONTEND_URL=$fe_val"
      else
        fail "FRONTEND_URL must start with https:// (got: $fe_val)"
      fi
    else
      fail "FRONTEND_URL is missing from .env"
    fi
  fi

  echo "== 5. Checking docker compose config interpolation =="
  if docker compose config >/dev/null 2>&1; then
    pass "docker compose config interpolation valid"
  else
    fail "docker compose config failed (check environment variables in .env)"
  fi

  echo "== 6. Checking container status & web build age =="
  info "current container status:"
  docker compose ps 2>&1 || true

  info "web container and build age:"
  if docker inspect jedana_web >/dev/null 2>&1; then
    local web_created
    local web_started
    local web_img_id
    local img_created="unknown"
    web_created=$(docker inspect -f '{{.Created}}' jedana_web 2>/dev/null || echo "unknown")
    web_started=$(docker inspect -f '{{.State.StartedAt}}' jedana_web 2>/dev/null || echo "unknown")
    web_img_id=$(docker inspect -f '{{.Image}}' jedana_web 2>/dev/null || echo "")
    if [ -n "$web_img_id" ]; then
      img_created=$(docker inspect -f '{{.Created}}' "$web_img_id" 2>/dev/null || echo "unknown")
    fi
    echo "      jedana_web container created: $web_created"
    echo "      jedana_web container started: $web_started"
    echo "      jedana_web image created:     $img_created"
  elif docker image inspect jedana-web:latest >/dev/null 2>&1; then
    local img_created
    img_created=$(docker image inspect -f '{{.Created}}' jedana-web:latest 2>/dev/null || echo "unknown")
    echo "      jedana-web:latest image created: $img_created"
  else
    echo "      jedana_web container is not currently created or running"
  fi

  echo ""
  if [ "$CHECK_FAILS" -eq 0 ]; then
    echo "== Summary: ALL CHECKS PASSED =="
    return 0
  else
    echo "== Summary: $CHECK_FAILS CHECK(S) FAILED =="
    return 1
  fi
}

do_verify() {
  echo ""
  echo "== Post-Deployment Verification =="
  local verify_fails=0

  # 1. Security headers on https://jedana.my.id/
  info "verifying security headers on https://jedana.my.id/..."
  local root_headers
  root_headers=$(curl -sI https://jedana.my.id/ 2>/dev/null || true)

  local headers_to_check=(
    "Strict-Transport-Security"
    "Content-Security-Policy"
    "X-Content-Type-Options"
    "X-Frame-Options"
    "Referrer-Policy"
    "Permissions-Policy"
  )

  for h in "${headers_to_check[@]}"; do
    if printf "%s\n" "$root_headers" | grep -qi "^${h}:"; then
      pass "header '$h' is present"
    else
      fail "header '$h' is MISSING"
      verify_fails=$((verify_fails + 1))
    fi
  done

  # 2. X-Powered-By absence on https://jedana.my.id/api/health
  info "verifying absence of X-Powered-By on https://jedana.my.id/api/health..."
  local health_headers
  health_headers=$(curl -sI https://jedana.my.id/api/health 2>/dev/null || true)
  if printf "%s\n" "$health_headers" | grep -qi "^x-powered-by:"; then
    fail "X-Powered-By header is PRESENT on /api/health (leaked)"
    verify_fails=$((verify_fails + 1))
  else
    pass "X-Powered-By header is NOT present on /api/health"
  fi

  # 3. Server container runs as uid=1000
  info "verifying server container user uid..."
  local server_id
  server_id=$(docker run --rm --entrypoint id jedana-server:latest 2>/dev/null || true)
  if [[ "$server_id" =~ ^uid=1000 ]]; then
    pass "server container runs as non-root ($server_id)"
  else
    fail "server container does not run as uid=1000 (output: '$server_id')"
    verify_fails=$((verify_fails + 1))
  fi

  # 4. POST /mcp returns 401 without auth
  info "verifying POST https://jedana.my.id/mcp returns 401..."
  local mcp_status
  mcp_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://jedana.my.id/mcp 2>/dev/null || true)
  if [ "$mcp_status" = "401" ]; then
    pass "POST https://jedana.my.id/mcp returned HTTP 401"
  else
    fail "POST https://jedana.my.id/mcp returned HTTP $mcp_status (expected 401)"
    verify_fails=$((verify_fails + 1))
  fi

  if [ "$verify_fails" -eq 0 ]; then
    echo ""
    echo "== Verification Result: ALL CHECKS PASSED =="
    local deployed_commit
    deployed_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    echo "Deployed commit: $deployed_commit"
    return 0
  else
    echo ""
    echo "== Verification Result: $verify_fails CHECK(S) FAILED =="
    return 1
  fi
}

do_rollback() {
  echo ""
  echo "== Initiating Rollback =="

  info "searching for latest rollback images..."
  local server_rollback=""
  local web_rollback=""

  if [ -f "$REPO_ROOT/.last_rollback_timestamp" ]; then
    local saved_ts
    saved_ts=$(cat "$REPO_ROOT/.last_rollback_timestamp" 2>/dev/null || true)
    if [ -n "$saved_ts" ]; then
      if docker image inspect "jedana-server:rollback-${saved_ts}" >/dev/null 2>&1; then
        server_rollback="jedana-server:rollback-${saved_ts}"
      fi
      if docker image inspect "jedana-web:rollback-${saved_ts}" >/dev/null 2>&1; then
        web_rollback="jedana-web:rollback-${saved_ts}"
      fi
    fi
  fi

  if [ -z "$server_rollback" ]; then
    server_rollback=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E '^jedana-server:rollback-' | sort -V | tail -n 1 || true)
  fi
  if [ -z "$web_rollback" ]; then
    web_rollback=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E '^jedana-web:rollback-' | sort -V | tail -n 1 || true)
  fi

  if [ -n "$server_rollback" ]; then
    info "server rollback target: $server_rollback"
  else
    echo "WARN  No server rollback image found matching jedana-server:rollback-*"
  fi

  if [ -n "$web_rollback" ]; then
    info "web rollback target: $web_rollback"
  else
    echo "WARN  No web rollback image found matching jedana-web:rollback-*"
  fi

  # 1. docker compose down
  info "step 1: stopping containers with docker compose down..."
  docker compose down

  # 2. retag rollback images
  info "step 2: retagging rollback images to :latest..."
  if [ -n "$server_rollback" ]; then
    docker tag "$server_rollback" jedana-server:latest
    info "retagged $server_rollback -> jedana-server:latest"
  fi
  if [ -n "$web_rollback" ]; then
    docker tag "$web_rollback" jedana-web:latest
    info "retagged $web_rollback -> jedana-web:latest"
  fi

  # 3. docker compose up -d
  info "step 3: starting containers with docker compose up -d..."
  docker compose up -d

  # 4. restore nginx host vhost
  info "step 4: restoring host nginx configuration..."
  local vhost_avail="/etc/nginx/sites-available/jedana.my.id.conf"
  local vhost_enabled="/etc/nginx/sites-enabled/jedana.my.id.conf"
  local latest_bak=""
  latest_bak=$(ls -1t /etc/nginx/sites-available/jedana.my.id.conf.bak* 2>/dev/null | head -n 1 || true)

  if [ -n "$latest_bak" ] && [ -f "$latest_bak" ]; then
    info "restoring nginx configuration from $latest_bak..."
    $SUDO cp "$latest_bak" "$vhost_avail"
    $SUDO ln -sfn "$vhost_avail" "$vhost_enabled"
    if run_nginx -t; then
      run_systemctl_reload_nginx
      info "nginx host reloaded successfully with restored configuration"
    else
      echo "ERROR: Restored nginx configuration failed 'nginx -t'!" >&2
    fi
  else
    info "no nginx backup file found at /etc/nginx/sites-available/jedana.my.id.conf.bak*, skipping nginx restore"
  fi

  echo "== Rollback completed =="
}

do_deploy() {
  echo "== Starting Production Deployment =="
  info "running pre-deployment checks..."
  if ! do_check; then
    echo "ERROR: Pre-deployment checks failed. Aborting deployment." >&2
    exit 1
  fi

  local timestamp
  timestamp=$(date +%Y%m%d-%H%M)
  info "tagging current images for rollback (tag: rollback-${timestamp})..."

  # Tag server image
  if docker image inspect jedana-server:latest >/dev/null 2>&1; then
    docker tag jedana-server:latest "jedana-server:rollback-${timestamp}"
    info "tagged jedana-server:latest -> jedana-server:rollback-${timestamp}"
  elif docker inspect jedana_server >/dev/null 2>&1; then
    local server_img
    server_img=$(docker inspect -f '{{.Image}}' jedana_server 2>/dev/null || true)
    if [ -n "$server_img" ]; then
      docker tag "$server_img" "jedana-server:rollback-${timestamp}"
      info "tagged running jedana_server ($server_img) -> jedana-server:rollback-${timestamp}"
    fi
  else
    info "no current server image found, skipping server rollback tag"
  fi

  # Tag web image
  if docker image inspect jedana-web:latest >/dev/null 2>&1; then
    docker tag jedana-web:latest "jedana-web:rollback-${timestamp}"
    info "tagged jedana-web:latest -> jedana-web:rollback-${timestamp}"
  elif docker inspect jedana_web >/dev/null 2>&1; then
    local web_img
    web_img=$(docker inspect -f '{{.Image}}' jedana_web 2>/dev/null || true)
    if [ -n "$web_img" ]; then
      docker tag "$web_img" "jedana-web:rollback-${timestamp}"
      info "tagged running jedana_web ($web_img) -> jedana-web:rollback-${timestamp}"
    fi
  else
    info "no current web image found, skipping web rollback tag"
  fi

  echo "${timestamp}" > "$REPO_ROOT/.last_rollback_timestamp"

  # Build & Up
  info "building server and web containers..."
  docker compose build server web

  info "starting containers with docker compose up -d..."
  docker compose up -d

  # Wait for healthy
  info "waiting for health check from http://127.0.0.1:8090/api/health (max 90s)..."
  local health_url="http://127.0.0.1:8090/api/health"
  local start_time
  start_time=$(date +%s)
  local max_wait=90
  local healthy=0

  while true; do
    if curl -fsS "$health_url" >/dev/null 2>&1; then
      healthy=1
      break
    fi

    local current_time
    current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    if [ "$elapsed" -ge "$max_wait" ]; then
      break
    fi

    sleep 2
  done

  if [ "$healthy" -eq 1 ]; then
    pass "health check passed (${health_url} responded OK)"
  else
    echo "ERROR: Health check failed after ${max_wait}s (${health_url} unreachable)!" >&2
    info "initiating automatic rollback..."
    do_rollback
    exit 1
  fi

  # Install host nginx vhost
  info "installing host nginx vhost..."
  local vhost_src="$REPO_ROOT/deploy/nginx/jedana.my.id.conf"
  local vhost_avail="/etc/nginx/sites-available/jedana.my.id.conf"
  local vhost_enabled="/etc/nginx/sites-enabled/jedana.my.id.conf"
  local backup_file="${vhost_avail}.bak-${timestamp}"

  if [ ! -f "$vhost_src" ]; then
    echo "ERROR: Vhost source template missing: $vhost_src" >&2
    exit 1
  fi

  $SUDO mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

  if [ -f "$vhost_avail" ]; then
    $SUDO cp "$vhost_avail" "$backup_file"
    $SUDO cp "$vhost_avail" "${vhost_avail}.bak"
    info "backed up existing vhost to $backup_file"
  fi

  $SUDO cp "$vhost_src" "$vhost_avail"
  $SUDO ln -sfn "$vhost_avail" "$vhost_enabled"
  info "copied $vhost_src to $vhost_avail and linked to $vhost_enabled"

  if ! run_nginx -t; then
    echo "ERROR: nginx -t failed with new configuration!" >&2
    if [ -f "$backup_file" ]; then
      info "restoring previous vhost backup from $backup_file..."
      $SUDO cp "$backup_file" "$vhost_avail"
      $SUDO ln -sfn "$vhost_avail" "$vhost_enabled"
      if run_nginx -t; then
        run_systemctl_reload_nginx
        echo "INFO: Restored previous nginx vhost backup and reloaded nginx." >&2
      fi
    else
      $SUDO rm -f "$vhost_enabled" "$vhost_avail"
    fi
    exit 1
  fi

  run_systemctl_reload_nginx
  pass "nginx host configuration reloaded successfully"

  # Post-deploy verification
  do_verify || exit 1
}

usage() {
  echo "Usage: $0 {--check|--deploy|--rollback}"
  echo ""
  echo "Commands:"
  echo "  --check     Read-only pre-flight checks (dependencies, git, env, docker)"
  echo "  --deploy    Run full deployment (checks, rollback tag, build, up, nginx, verify)"
  echo "  --rollback  Rollback to the most recent rollback images and nginx backup"
  exit 1
}

if [ $# -ne 1 ]; then
  usage
fi

case "$1" in
  --check)
    do_check || exit 1
    ;;
  --deploy)
    do_deploy
    ;;
  --rollback)
    do_rollback
    ;;
  *)
    usage
    ;;
esac
