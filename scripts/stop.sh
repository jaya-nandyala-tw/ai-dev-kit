#!/bin/bash
set -e

# Guard: re-exec under bash if invoked via sh/zsh
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

# ============================================
# stop / teardown
# ============================================
# Usage:
#   ./stop.sh              # Stop containers, kill processes
#   ./stop.sh --clean      # Also remove DB volume (fresh seed on next start)
#   ./stop.sh --nuke       # Remove containers, volumes, venv, node_modules
#
# GENERICIZED TEMPLATE — this assumes a local dev stack with a
# docker-compose.yml at the repo root (not included in this starter kit —
# add your own) and a couple of long-running local dev processes (a
# backend, a frontend dev server, maybe a mock auth server). Fill in:
#   - The `pkill`/`lsof` patterns and ports under "Kill background processes"
#   - The paths removed under --nuke
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[stop]${NC} $1"; }
warn()  { echo -e "${YELLOW}[stop]${NC} $1"; }

# Detect compose command
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  COMPOSE=""
fi

# If Docker CLI can't connect, try Colima socket
if [[ -n "$COMPOSE" ]] && ! docker info &>/dev/null 2>&1; then
  colima_sock="$HOME/.colima/default/docker.sock"
  if [[ -S "$colima_sock" ]]; then
    export DOCKER_HOST="unix://$colima_sock"
  fi
fi

MODE="${1:-}"

# ── Kill background processes — fill in your own process patterns/ports ──
info "Killing local processes..."
pkill -f "<your-backend-run-command>" 2>/dev/null && info "  Stopped backend" || true
pkill -f "<your-frontend-dev-server-command>" 2>/dev/null && info "  Stopped frontend" || true
lsof -ti:<your-frontend-port> 2>/dev/null | xargs kill 2>/dev/null || true
lsof -ti:<your-backend-port> 2>/dev/null | xargs kill 2>/dev/null || true

# ── Stop Docker containers ──
if [[ -n "$COMPOSE" ]] && docker info &>/dev/null 2>&1 && [[ -f "$ROOT_DIR/docker-compose.yml" ]]; then
  COMPOSE="$COMPOSE -f $ROOT_DIR/docker-compose.yml"
  case "$MODE" in
    --clean)
      info "Stopping containers and removing DB volume..."
      $COMPOSE down -v
      info "DB volume removed — next start will re-seed."
      ;;
    --nuke)
      info "Full cleanup: containers, volumes, generated files..."
      $COMPOSE down -v
      # rm -rf codebase/<service-name>/service/.venv && info "  Removed service .venv"
      # rm -rf codebase/<service-name>/ui/node_modules && info "  Removed UI node_modules"
      ;;
    *)
      info "Stopping containers..."
      $COMPOSE down
      ;;
  esac
else
  warn "Docker not running, Compose not found, or no docker-compose.yml — skipping container teardown"
fi

info "Done."

# ── Clear AWS session ──
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi
AWS_CREDS="$HOME/.aws/credentials"
PROFILE="${AWS_PROFILE:-}"
if [[ -n "$PROFILE" && -f "$AWS_CREDS" ]] && grep -q "\[$PROFILE\]" "$AWS_CREDS" 2>/dev/null; then
  sed -i '' "/^\[$PROFILE\]$/,/^\[/{/^aws_/d;}" "$AWS_CREDS" 2>/dev/null || true
  info "AWS session cleared ($PROFILE)"
fi

echo ""
echo "  start again:  ./start.sh"
echo "  fresh DB:     ./stop.sh --clean && ./start.sh"
echo "  full reset:   ./stop.sh --nuke && ./start.sh"
