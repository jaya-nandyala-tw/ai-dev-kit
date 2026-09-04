#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Repo setup — clones all code repos for this workspace
# ============================================
# Usage:
#   ./clone-repos.sh           # Interactive picker
#   ./clone-repos.sh --all     # Clone everything
#
# Prerequisites:
#   - SSH key configured for GitHub
#   - git installed
#
# Repos are cloned into codebase/ and are gitignored — only speckits and
# AI context are tracked in this repo.
#
# GENERICIZED TEMPLATE — fill in your own GitHub org and repo lists below.
# The mechanism (protocol detection, clone-or-pull-latest, scoped groups)
# is reusable regardless of how many repos or groups you have.
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEBASE="$ROOT_DIR/codebase"
mkdir -p "$CODEBASE"

# ── GitHub org — fill in your own ──
SSH_ORG="git@github.com:<your-github-org>"
HTTPS_ORG="https://github.com/<your-github-org>"

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

# ── Repo groups — fill in your own service/repo names ──
# CORE_REPOS clone directly into codebase/<repo>.
CORE_REPOS="<service-name> <another-service-name>"

# WORKER_REPOS clone into codebase/workers/<repo> — delete this group entirely
# if your workspace is a single repo or doesn't have a worker/lambda tier.
WORKER_REPOS="
<worker-repo-1>
<worker-repo-2>
"

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
for repo in $CORE_REPOS; do
  clone_repo "$repo" "$CODEBASE"
done

if [[ "$CLONE_WORKERS" == "true" ]]; then
  echo ""
  echo "── Workers ──"
  mkdir -p "$CODEBASE/workers"
  for repo in $WORKER_REPOS; do
    clone_repo "$repo" "$CODEBASE/workers"
  done
fi

echo ""
echo "Done: $cloned cloned, $skipped updated, $failed failed"
