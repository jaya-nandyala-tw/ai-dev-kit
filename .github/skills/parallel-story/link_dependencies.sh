#!/bin/bash

set -euo pipefail

REPO_PATH=${1:-}
WORKTREE_PATH=${2:-}

if [[ -z "$REPO_PATH" || -z "$WORKTREE_PATH" ]]; then
    echo "Usage: $0 <repo_path> <worktree_path>" >&2
    exit 2
fi

if [[ ! -d "$REPO_PATH" || ! -d "$WORKTREE_PATH" ]]; then
    echo "ERROR: Repository and worktree paths must both exist." >&2
    exit 1
fi

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd -P)
ABS_REPO=$(cd "$REPO_PATH" && pwd -P)
ABS_WORKTREE=$(cd "$WORKTREE_PATH" && pwd -P)

if [[ "$ABS_REPO" == "$ABS_WORKTREE" ]]; then
    echo "ERROR: Dependency setup must run in a separate story worktree." >&2
    exit 1
fi

case "$ABS_WORKTREE/" in
    "$ROOT_DIR"/codebase/worktrees/*) ;;
    *)
        echo "ERROR: Worktree must be under $ROOT_DIR/codebase/worktrees." >&2
        exit 1
        ;;
esac

WORKTREE_ROOT=$(git -C "$ABS_WORKTREE" rev-parse --show-toplevel)
WORKTREE_ROOT=$(cd "$WORKTREE_ROOT" && pwd -P)
if [[ "$WORKTREE_ROOT" != "$ABS_WORKTREE" ]]; then
    echo "ERROR: Target path is not the root of a Git worktree: $WORKTREE_PATH" >&2
    exit 1
fi

DEPENDENCY_CONFIG=$(python3 "$ROOT_DIR/scripts/repo_config.py" dependency-paths-for-repo "$ABS_REPO")
ROLE_PATHS=$(python3 -c '
import json
import sys
config = json.load(sys.stdin)
for role in ("ui", "service"):
    path = config.get(role)
    if path is not None:
        print(f"{role}\t{path}")
' <<< "$DEPENDENCY_CONFIG")

if [[ -z "$ROLE_PATHS" ]]; then
    echo "No UI or service layer is configured for $ABS_REPO; dependency links skipped."
    exit 0
fi

while IFS=$'\t' read -r ROLE LAYER_PATH; do
    if [[ "$ROLE" == "ui" ]]; then
        DEPENDENCY_DIR="node_modules"
    elif [[ "$ROLE" == "service" ]]; then
        DEPENDENCY_DIR=".venv"
    else
        echo "ERROR: Unsupported repository role '$ROLE'." >&2
        exit 1
    fi

    MAIN_LAYER="$ABS_REPO/$LAYER_PATH"
    WORKTREE_LAYER="$ABS_WORKTREE/$LAYER_PATH"
    if [[ ! -d "$MAIN_LAYER" || ! -d "$WORKTREE_LAYER" ]]; then
        echo "ERROR: Configured $ROLE layer '$LAYER_PATH' must exist in both the main checkout and worktree." >&2
        exit 1
    fi
    MAIN_LAYER=$(cd "$MAIN_LAYER" && pwd -P)
    WORKTREE_LAYER=$(cd "$WORKTREE_LAYER" && pwd -P)
    case "$MAIN_LAYER/" in
        "$ABS_REPO/"*) ;;
        *)
            echo "ERROR: Configured $ROLE layer resolves outside the main repository: $LAYER_PATH" >&2
            exit 1
            ;;
    esac
    case "$WORKTREE_LAYER/" in
        "$ABS_WORKTREE/"*) ;;
        *)
            echo "ERROR: Configured $ROLE layer resolves outside the worktree: $LAYER_PATH" >&2
            exit 1
            ;;
    esac

    MAIN_DEPENDENCIES="$MAIN_LAYER/$DEPENDENCY_DIR"
    WORKTREE_DEPENDENCIES="$WORKTREE_LAYER/$DEPENDENCY_DIR"
    if [[ ! -d "$MAIN_DEPENDENCIES" ]]; then
        echo "ERROR: Main checkout dependencies are missing: $MAIN_DEPENDENCIES" >&2
        exit 1
    fi
    MAIN_DEPENDENCIES=$(cd "$MAIN_DEPENDENCIES" && pwd -P)
    case "$MAIN_DEPENDENCIES/" in
        "$ABS_REPO/"*) ;;
        *)
            echo "ERROR: $ROLE dependencies resolve outside the main repository: $LAYER_PATH/$DEPENDENCY_DIR" >&2
            exit 1
            ;;
    esac

    if [[ -L "$WORKTREE_DEPENDENCIES" ]]; then
        if [[ ! -e "$WORKTREE_DEPENDENCIES" ]]; then
            echo "ERROR: Refusing dangling dependency symlink: $WORKTREE_DEPENDENCIES" >&2
            exit 1
        fi
        if [[ ! -d "$WORKTREE_DEPENDENCIES" ]]; then
            echo "ERROR: Existing dependency symlink is not a directory: $WORKTREE_DEPENDENCIES" >&2
            exit 1
        fi
        EXISTING_TARGET=$(cd "$WORKTREE_DEPENDENCIES" && pwd -P)
        if [[ "$EXISTING_TARGET" == "$MAIN_DEPENDENCIES" ]]; then
            echo "$ROLE dependencies already point to the main checkout."
            continue
        fi
        echo "ERROR: $WORKTREE_DEPENDENCIES is already a symlink to a different target." >&2
        exit 1
    fi
    if [[ -e "$WORKTREE_DEPENDENCIES" ]]; then
        echo "ERROR: Refusing to replace existing worktree dependencies: $WORKTREE_DEPENDENCIES" >&2
        exit 1
    fi

    ln -s "$MAIN_DEPENDENCIES" "$WORKTREE_DEPENDENCIES"
    echo "Linked $ROLE dependencies: $WORKTREE_DEPENDENCIES -> $MAIN_DEPENDENCIES"
done <<< "$ROLE_PATHS"
