#!/usr/bin/env bash
# ============================================
# Apply pre-commit hooks — installs the pre-commit git hook into one or more already-cloned
# repos under codebase/ (core services and/or workers), so `git commit` inside those repos
# also runs their own .pre-commit-config.yaml, not just this harness repo's.
# ============================================
# Usage:
#   ./apply-pre-commit-hooks.sh <repo-relative-dir> [<repo-relative-dir> ...]
#   e.g. ./apply-pre-commit-hooks.sh codebase/billing-service codebase/workers/notifications-worker
#
# Deliberately does NOT use `set -e` — one repo failing (not cloned yet, no
# .pre-commit-config.yaml of its own, pre-commit itself missing) shouldn't abort the whole run;
# each repo is logged and skipped/failed independently, then the run's own exit code reflects
# whether anything actually failed.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <repo-relative-dir> [<repo-relative-dir> ...]" >&2
  exit 1
fi

if ! command -v pre-commit >/dev/null 2>&1; then
  echo "✗ pre-commit is not on PATH. Run the \"Pre-commit hooks\" step's install button first." >&2
  exit 1
fi

applied=0
skipped=0
failed=0

for rel in "$@"; do
  dir="$ROOT_DIR/$rel"
  echo "── $rel ──"

  if [[ ! -d "$dir/.git" ]]; then
    echo "  ⚠ Not a cloned git repo yet — clone it first (skipping)."
    skipped=$((skipped + 1))
    echo ""
    continue
  fi

  if [[ ! -f "$dir/.pre-commit-config.yaml" ]]; then
    echo "  ⚠ No .pre-commit-config.yaml in this repo — nothing for pre-commit to hook into (skipping)."
    skipped=$((skipped + 1))
    echo ""
    continue
  fi

  if (cd "$dir" && pre-commit install); then
    echo "  ✓ Hook installed"
    applied=$((applied + 1))
  else
    echo "  ✗ pre-commit install failed"
    failed=$((failed + 1))
  fi
  echo ""
done

echo "Done: $applied applied, $skipped skipped, $failed failed"
[[ $failed -eq 0 ]]
