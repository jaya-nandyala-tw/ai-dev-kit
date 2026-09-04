#!/bin/bash
set -e

# Guard: re-exec under bash if invoked via sh/zsh
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

# ============================================
# Developer Profile Manager
# ============================================
# Manage dev profiles that configure start.sh behavior.
#
# Usage:
#   ./profile.sh list              # List available profiles
#   ./profile.sh apply <name>      # Apply a profile to .env
#   ./profile.sh show <name>       # Show profile contents
#   ./profile.sh current           # Show active profile
#
# GENERICIZED TEMPLATE — this expects a profiles/*.env directory (see
# /profiles/README.md) and a .env.template at the repo root to seed .env
# from on first use. The optional LDAP-block preservation logic below is
# an example of "some profile-independent settings block should survive
# reapplying a profile" — delete it if you don't have an equivalent, or
# adapt the section name to your own always-preserved block.
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROFILES_DIR="$ROOT_DIR/profiles"
ENV_FILE="$ROOT_DIR/.env"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[profile]${NC} $1"; }
warn()  { echo -e "${YELLOW}[profile]${NC} $1"; }

list_profiles() {
  echo ""
  echo "Available profiles:"
  echo ""
  for f in "$PROFILES_DIR"/*.env; do
    [[ -f "$f" ]] || continue
    local name
    name="$(basename "$f" .env)"
    local desc
    desc="$(head -2 "$f" | grep '^#' | sed 's/^# Profile: //' | head -1)"
    local active=""
    if [[ -f "$ENV_FILE" ]] && grep -q "^PROFILE=$name" "$ENV_FILE" 2>/dev/null; then
      active=" ${GREEN}(active)${NC}"
    fi
    printf "  ${CYAN}%-15s${NC} %s%b\n" "$name" "$desc" "$active"
  done
  echo ""
}

show_profile() {
  local name="$1"
  local profile_file="$PROFILES_DIR/${name}.env"

  if [[ ! -f "$profile_file" ]]; then
    warn "Profile not found: $name"
    list_profiles
    exit 1
  fi

  echo ""
  echo -e "${CYAN}Profile: $name${NC}"
  echo "─────────────────────────"
  cat "$profile_file"
  echo ""
}

apply_profile() {
  local name="$1"
  local profile_file="$PROFILES_DIR/${name}.env"

  if [[ ! -f "$profile_file" ]]; then
    warn "Profile not found: $name"
    list_profiles
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    warn ".env not found. Creating from template..."
    cp "$ROOT_DIR/.env.template" "$ENV_FILE"
  fi

  # Preserve user-specific settings that live outside the profile block —
  # fill in your own list of always-preserved variable names.
  local dev_email aws_env aws_profile
  dev_email="$(grep '^DEV_EMAIL=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)"
  aws_env="$(grep '^AWS_ENV=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)"
  aws_profile="$(grep '^AWS_PROFILE=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)"

  local temp_env
  temp_env=$(mktemp)
  sed '/^# ── Profile:/,$d' "$ENV_FILE" | \
    sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' > "$temp_env"

  echo "" >> "$temp_env"
  echo "# ── Profile: $name ──" >> "$temp_env"
  echo "PROFILE=$name" >> "$temp_env"
  grep -v '^#' "$profile_file" | grep -v '^\s*$' | grep -v '^DEV_EMAIL=\|^AWS_ENV=\|^AWS_PROFILE=' >> "$temp_env" || true

  mv "$temp_env" "$ENV_FILE"

  info "Applied profile: $name"

  local start_mode
  start_mode="$(grep '^START_MODE=' "$ENV_FILE" | cut -d= -f2-)"
  case "${start_mode:-all}" in
    all)     info "→ ./start.sh will run: everything" ;;
    service) info "→ ./start.sh will run: DB + backend only" ;;
    ui)      info "→ ./start.sh will run: DB + frontend only" ;;
    db)      info "→ ./start.sh will run: DB only" ;;
  esac
}

show_current() {
  if [[ ! -f "$ENV_FILE" ]]; then
    warn "No .env file found."
    exit 1
  fi

  local profile
  profile="$(grep '^PROFILE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  if [[ -z "$profile" ]]; then
    info "No profile set (using defaults)"
  else
    info "Active profile: $profile"
    show_profile "$profile"
  fi
}

# ── Main ──
CMD="${1:-list}"
shift 2>/dev/null || true

case "$CMD" in
  list)    list_profiles ;;
  apply)   apply_profile "${1:?Profile name required}" ;;
  show)    show_profile "${1:?Profile name required}" ;;
  current) show_current ;;
  -h|--help)
    head -15 "$0" | grep '^#' | sed 's/^# \?//'
    exit 0
    ;;
  *)
    warn "Unknown command: $CMD"
    echo "Usage: ./profile.sh [list|apply|show|current] [name]"
    exit 1
    ;;
esac
