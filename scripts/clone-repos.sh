#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Repo setup — clones repos listed in config/repos.json
# ============================================
# Usage:
#   ./clone-repos.sh              # Interactive picker (core / core+workers)
#   ./clone-repos.sh --all        # Clone everything in config/repos.json
#   ./clone-repos.sh --core-only  # Clone only tier:"core" repos
#   ./clone-repos.sh --select     # Discover repos via GitHub CLI first, then clone
#                                  #   (everything after --select forwards to select-repos.sh,
#                                  #    e.g. --select --org my-org; cloning then prompts as usual)
#
# Prerequisites:
#   - SSH key configured for GitHub (or HTTPS access)
#   - git and python3 installed
#   - config/repos.json filled in — edit it by hand, or run `./clone-repos.sh --select`
#     to populate it via the GitHub CLI. See ONBOARDING.md § Adding Other Repos to This Harness.
#
# Repos are cloned into codebase/ and are gitignored — only speckits and AI context are
# tracked in this repo. config/repos.json IS tracked: it's the one file to edit to change
# what gets cloned, pulled, and shown in the VS Code workspace.
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEBASE="$ROOT_DIR/codebase"
CONFIG_HELPER="$SCRIPT_DIR/repo_config.py"
mkdir -p "$CODEBASE"

if ! command -v python3 >/dev/null 2>&1; then
  echo "✗ python3 is required (used to read config/repos.json)." >&2
  exit 1
fi

if [[ "${1:-}" == "--select" ]]; then
  shift
  "$SCRIPT_DIR/select-repos.sh" "$@"
  echo ""
  set --   # scope-selection prompt below still applies; don't forward --select's own args
fi

ORG_NAME="$(python3 "$CONFIG_HELPER" org)"
if [[ -z "$ORG_NAME" || "$ORG_NAME" == "<your-github-org>" ]]; then
  echo "✗ config/repos.json has no github.org set (or it's still the placeholder)." >&2
  echo "  Edit config/repos.json by hand, or run: ./scripts/clone-repos.sh --select" >&2
  exit 1
fi

CORE_REPOS="$(python3 "$CONFIG_HELPER" core-repos)"
WORKER_REPOS="$(python3 "$CONFIG_HELPER" worker-repos)"

if [[ -z "$CORE_REPOS" && -z "$WORKER_REPOS" ]]; then
  echo "✗ config/repos.json has no repos listed yet." >&2
  echo "  Edit config/repos.json by hand, or run: ./scripts/clone-repos.sh --select" >&2
  exit 1
fi

SSH_ORG="git@github.com:${ORG_NAME}"
HTTPS_ORG="https://github.com/${ORG_NAME}"

# ── Protocol detection ──
detect_git_protocol() {
  local ssh_out
  ssh_out=$(ssh -T git@github.com 2>&1) || true
  if echo "$ssh_out" | grep -qi "successfully authenticated"; then
    ORG="$SSH_ORG"
    echo "  ✓ SSH access to GitHub verified"
  else
    echo ""
    echo "  ⚠ SSH access to GitHub failed."
    echo "    This usually means you don't have an SSH key configured."
    echo ""
    printf "  Would you like to clone using HTTPS instead? [Y/n]: "
    read -r answer
    if [[ -z "$answer" || "$answer" =~ ^[Yy] ]]; then
      ORG="$HTTPS_ORG"
      echo "  → Using HTTPS (you may be prompted for credentials)"
    else
      echo "  Aborting. Set up SSH keys first:"
      echo "    https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
      exit 1
    fi
  fi
}

ORG="$SSH_ORG"

echo "── Repo setup ──"
echo ""

detect_git_protocol

# ── Scope selection ──
CLONE_WORKERS=true

case "${1:-}" in
  --all) ;;
  --core-only) CLONE_WORKERS=false ;;
  *)
    echo "What do you want to clone?"
    echo ""
    echo "  1) Core services only"
    echo "  2) Core services + workers"
    echo ""
    printf "  Pick [1-2] or press Enter for 2 (all): "
    read -r choice
    case "${choice:-2}" in
      1) CLONE_WORKERS=false ;;
      2) ;;
      *) echo "Invalid choice"; exit 1 ;;
    esac
    ;;
esac

cloned=0
skipped=0
failed=0

clone_repo() {
  local repo="$1" target_dir="$2"
  [[ -z "$repo" ]] && return
  local url="${ORG}/${repo}.git"
  local dir="$target_dir/$repo"
  if [[ -d "$dir/.git" ]]; then
    echo "  ✓ $repo (exists, pulling latest)"
    (cd "$dir" && git pull --ff-only 2>/dev/null) || echo "    ⚠ pull failed — may have local changes"
    skipped=$((skipped + 1))
  else
    echo "  ↓ Cloning $repo ..."
    if git clone "$url" "$dir" 2>/dev/null; then
      cloned=$((cloned + 1))
    else
      echo "    ✗ Failed to clone $url"
      failed=$((failed + 1))
    fi
  fi
}

echo "── Core services ──"
while IFS= read -r repo; do
  clone_repo "$repo" "$CODEBASE"
done <<< "$CORE_REPOS"

if [[ "$CLONE_WORKERS" == "true" ]]; then
  echo ""
  echo "── Workers ──"
  mkdir -p "$CODEBASE/workers"
  while IFS= read -r repo; do
    clone_repo "$repo" "$CODEBASE/workers"
  done <<< "$WORKER_REPOS"
fi

echo ""
echo "Done: $cloned cloned, $skipped updated, $failed failed"
