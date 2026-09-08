"""
confluence_cli.py — JSON-emitting CLI for ConfluenceClient.

Meant to be invoked as a subprocess by other tooling (e.g. the onboarding-ui
Acquire Context page) rather than typed by a human — see agent.py for the
human-facing interactive equivalent.

Usage:
    python -m atlassian_client.confluence_cli search "<query>" [--space KEY] [--limit N]
    python -m atlassian_client.confluence_cli get <page_id>

Always prints exactly one JSON value to stdout, on both success and failure,
so callers can unconditionally json.loads(stdout) — check the process exit
code (0 = success) to tell which shape to expect: on failure the value is
{"error": "<message>"} instead of the normal result.
"""

from __future__ import annotations

import argparse
import json
import sys

from . import config
from .base_client import AtlassianClientError
from .confluence_client import ConfluenceClient
from .models import ConfluencePage

_REQUIRED_ENV = ("JIRA_BASE_URL", "JIRA_API_TOKEN", "DEV_EMAIL")


def _page_to_dict(page: ConfluencePage) -> dict[str, object]:
    return {
        "id": page.id,
        "title": page.title,
        "spaceKey": page.space_key,
        "url": page.url,
        "version": page.version,
        "excerpt": page.excerpt,
        "body": page.body,
    }


def _fail(message: str) -> None:
    json.dump({"error": message}, sys.stdout)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m atlassian_client.confluence_cli")
    sub = parser.add_subparsers(dest="command", required=True)

    search_p = sub.add_parser("search")
    search_p.add_argument("query")
    search_p.add_argument("--space", dest="space_key", default=None)
    search_p.add_argument("--limit", type=int, default=25)

    get_p = sub.add_parser("get")
    get_p.add_argument("page_id")

    args = parser.parse_args()

    missing = [key for key in _REQUIRED_ENV if not config.get(key)]
    if missing:
        _fail(f"Missing required environment variable(s): {', '.join(missing)}")
        return

    try:
        client = ConfluenceClient()
        if args.command == "search":
            pages = client.search_pages(args.query, space_key=args.space_key, limit=args.limit)
            json.dump([_page_to_dict(p) for p in pages], sys.stdout)
        elif args.command == "get":
            page = client.get_page_content(args.page_id)
            json.dump(_page_to_dict(page), sys.stdout)
    except AtlassianClientError as exc:
        _fail(str(exc))
    except Exception as exc:  # noqa: BLE001 — always report as JSON, never a bare traceback
        _fail(f"Unexpected error: {exc}")


if __name__ == "__main__":
    main()
