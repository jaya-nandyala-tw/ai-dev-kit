#!/bin/bash
# Thin wrapper — delegates to workspace.py (avoids bash 3.2 limitations on macOS)
exec python3 "$(dirname "$0")/workspace.py" "$@"
