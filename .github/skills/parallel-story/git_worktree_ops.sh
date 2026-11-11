#!/bin/bash

set -euo pipefail

COMMAND=${1:-}
REPO_PATH=${2:-}
TICKET=${3:-}
REPO_ID=${4:-}
BRANCH_NAME=${5:-}
BASE_REF=${6:-main}

if [[ -z "$COMMAND" || -z "$REPO_PATH" || -z "$TICKET" || -z "$REPO_ID" || -z "$BRANCH_NAME" ]]; then
    echo "Usage: $0 <add|remove> <repo_path> <ticket> <repo_id> <branch_name> [base_ref]" >&2
    exit 2
fi

if [[ ! "$TICKET" =~ ^[A-Za-z][A-Za-z0-9]*-[0-9]+$ ]]; then
    echo "ERROR: Invalid ticket ID: $TICKET" >&2
    exit 2
fi

if [[ ! "$REPO_ID" =~ ^[A-Za-z0-9._-]+$ || "$REPO_ID" == "." || "$REPO_ID" == ".." ]]; then
    echo "ERROR: Invalid repository ID: $REPO_ID" >&2
    exit 2
fi

if [[ "$BRANCH_NAME" != "$TICKET"* && "$BRANCH_NAME" != "feature/$TICKET"* ]]; then
    echo "ERROR: Branch name must use the ticket prefix '$TICKET'." >&2
    exit 2
fi

if [[ ! -d "$REPO_PATH" ]]; then
    echo "ERROR: Repository path does not exist: $REPO_PATH" >&2
    exit 1
fi

ABS_REPO=$(cd "$REPO_PATH" && pwd -P)
ABS_ROOT=$(cd "$(dirname "$0")/../../.." && pwd -P)
case "$ABS_REPO/" in
    "$ABS_ROOT"/codebase/*) ;;
    *)
        echo "ERROR: Repository path must be inside $ABS_ROOT/codebase." >&2
        exit 1
        ;;
esac
WORKTREE_PATH="$ABS_ROOT/codebase/worktrees/$TICKET/$REPO_ID"

if [[ "$COMMAND" == "add" ]]; then
    git -C "$ABS_REPO" rev-parse --verify "${BASE_REF}^{commit}" >/dev/null
    if [[ -e "$WORKTREE_PATH" || -L "$WORKTREE_PATH" ]]; then
        echo "ERROR: Worktree target already exists; inspect and coordinate with its active session: $WORKTREE_PATH" >&2
        exit 1
    fi

    mkdir -p "$(dirname "$WORKTREE_PATH")"
    if git -C "$ABS_REPO" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        git -C "$ABS_REPO" worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
    else
        git -C "$ABS_REPO" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_REF"
    fi
    echo "SUCCESS:$WORKTREE_PATH"
elif [[ "$COMMAND" == "remove" ]]; then
    if [[ ! -d "$WORKTREE_PATH" ]]; then
        echo "ERROR: Worktree does not exist: $WORKTREE_PATH" >&2
        exit 1
    fi

    WORKTREE_ROOT=$(git -C "$WORKTREE_PATH" rev-parse --show-toplevel)
    WORKTREE_ROOT=$(cd "$WORKTREE_ROOT" && pwd -P)
    EXPECTED_WORKTREE_PATH=$(cd "$WORKTREE_PATH" && pwd -P)
    WORKTREE_BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
    if [[ "$WORKTREE_ROOT" != "$EXPECTED_WORKTREE_PATH" || "$WORKTREE_BRANCH" != "$BRANCH_NAME" ]]; then
        echo "ERROR: Worktree path or branch does not match the requested repository and branch." >&2
        exit 1
    fi

    if [[ -n "$(git -C "$WORKTREE_PATH" status --porcelain --untracked-files=all)" ]]; then
        echo "ERROR: Cannot remove $REPO_ID; the worktree has uncommitted changes." >&2
        exit 1
    fi

    git -C "$ABS_REPO" worktree remove "$WORKTREE_PATH"
    git -C "$ABS_REPO" worktree prune
    rmdir "$(dirname "$WORKTREE_PATH")" 2>/dev/null || true
    echo "CLEANUP_SUCCESS:$WORKTREE_PATH"
else
    echo "ERROR: Unknown operation: $COMMAND" >&2
    exit 2
fi
