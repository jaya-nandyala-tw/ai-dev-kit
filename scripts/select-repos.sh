#!/bin/bash
# Thin wrapper — delegates to select-repos.py (avoids bash 3.2 limitations on macOS)
exec python3 "$(dirname "$0")/select-repos.py" "$@"
