#!/usr/bin/env bash
set -euo pipefail

# GENERICIZED TEMPLATE — replace REPOS below with your own workspace's repo
# list, or auto-discover every git repo under codebase/ (see the commented
# alternative). This script's job is just "git pull --ff-only across the
# whole multi-repo workspace and report pass/fail per repo."

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Option A — explicit list (fill in your own):
REPOS=(
  codebase/<service-name>
  codebase/<another-service-name>
)

# Option B — auto-discover every git repo under codebase/ instead:
# REPOS=()
# while IFS= read -r -d '' d; do
#   REPOS+=("${d#"$WORKSPACE_ROOT/"}")
# done < <(find "$WORKSPACE_ROOT/codebase" -maxdepth 3 -name .git -type d -print0 | xargs -0 -n1 dirname -z 2>/dev/null)

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
