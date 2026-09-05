#!/usr/bin/env bash
set -euo pipefail

# Pulls latest for every repo listed in config/repos.json — the same single
# source of truth clone-repos.sh and workspace.py read. Edit config/repos.json
# (by hand or via ./scripts/clone-repos.sh --select) to change what this pulls.

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "✗ python3 is required (used to read config/repos.json)." >&2
  exit 1
fi

REPOS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && REPOS+=("$line")
done < <(python3 "$WORKSPACE_ROOT/scripts/repo_config.py" all-paths)

if [[ ${#REPOS[@]} -eq 0 ]]; then
  echo "No repos listed in config/repos.json yet — nothing to pull."
  exit 0
fi

PASSED=0
FAILED=0
FAILURES=()

echo "Pulling latest code for ${#REPOS[@]} repos..."
echo ""

for repo in "${REPOS[@]}"; do
  repo="${repo%/}"
  dir="$WORKSPACE_ROOT/$repo"
  name="$(basename "$repo")"

  if [ ! -d "$dir/.git" ]; then
    echo "⏭  $name — not a git repo, skipping"
    continue
  fi

  printf "%-55s" "⟳  $name"
  if output=$(git -C "$dir" pull --ff-only 2>&1); then
    echo "✓  $(echo "$output" | tail -1)"
    ((PASSED++))
  else
    echo "✗  FAILED"
    FAILURES+=("$name: $output")
    ((FAILED++))
  fi
done

echo ""
echo "Done: $PASSED succeeded, $FAILED failed out of ${#REPOS[@]} repos."

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
