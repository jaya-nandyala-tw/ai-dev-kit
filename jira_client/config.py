"""
config.py — Environment variable loading and validation.

Reads from the global .env file at the workspace root.
Exits early with a clear message if required variables are missing.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load from the workspace-root .env (two levels up from this file)
_WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = _WORKSPACE_ROOT / ".env"

load_dotenv(dotenv_path=_ENV_PATH, override=False)

# ── Required variables ──────────────────────────────────────────────────────
_REQUIRED: list[str] = [
    "JIRA_BASE_URL",
    "JIRA_API_TOKEN",
    "DEV_EMAIL",
]


def validate() -> None:
    """Validate that all required Jira environment variables are set.

    Exits with exit code 1 and a descriptive message if any are missing.
    """
    missing = [key for key in _REQUIRED if not os.getenv(key)]
    if missing:
        print(
            "ERROR: The following required environment variables are not set:\n"
            + "\n".join(f"  - {k}" for k in missing)
            + "\n\nCopy jira_client/.env.example → .env and fill in your Jira credentials.",
            file=sys.stderr,
        )
        sys.exit(1)


def get(key: str, default: str | None = None) -> str | None:
    """Return the value of an environment variable."""
    return os.getenv(key, default)


# ── Convenience accessors (populated after validate()) ──────────────────────


def base_url() -> str:
    """Return the Jira base URL (e.g. https://<your-org>.atlassian.net)."""
    return os.environ["JIRA_BASE_URL"].rstrip("/")


def api_token() -> str:
    """Return the Atlassian API token."""
    return os.environ["JIRA_API_TOKEN"]


def user_email() -> str:
    """Return the Atlassian account email used for Basic Auth (sourced from DEV_EMAIL)."""
    return os.environ["DEV_EMAIL"]
