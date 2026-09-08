"""
confluence_client.py — ConfluenceClient: read-only Confluence Cloud REST client.

Supports Confluence Cloud REST API v1 (CQL-based content search and content
fetch). Authentication is shared with JiraClient — same email + API token,
same retry/error handling — via AtlassianRestClient (see base_client.py).

Read-only by design: no create/update/delete methods.
"""

from __future__ import annotations

import html
import re
from typing import Any

from . import config
from .base_client import AtlassianClientError, AtlassianRestClient
from .models import ConfluencePage

# Kept as a distinct name for readability at call sites — Jira and
# Confluence share one error type under the hood.
ConfluenceClientError = AtlassianClientError


class ConfluenceClient(AtlassianRestClient):
    """Thin, read-only wrapper around the Confluence Cloud REST API.

    Usage::

        client = ConfluenceClient()
        results = client.search_pages("onboarding runbook")
        page = client.get_page_content(results[0].id)

    Reuses the same Atlassian email + API token as JiraClient. The
    Confluence base URL defaults to ``<JIRA_BASE_URL>/wiki`` (the common
    case where Jira and Confluence share one Atlassian Cloud site); set
    CONFLUENCE_BASE_URL to override.
    """

    def __init__(self) -> None:
        super().__init__(config.confluence_base_url())

    # ── Public API ────────────────────────────────────────────────────────────

    def search_pages(
        self, query: str, space_key: str | None = None, limit: int = 25
    ) -> list[ConfluencePage]:
        """Search Confluence pages by free text using CQL.

        Args:
            query: Free-text search string.
            space_key: Optional Confluence space key to restrict results
                (e.g. ``"ENG"``). When omitted, all spaces are searched.
            limit: Maximum number of results to return (default 25).

        Returns:
            A list of :class:`ConfluencePage` with an excerpt but no full
            body — call :meth:`get_page_content` for the full page text.
        """
        escaped_query = query.replace('"', '\\"')
        cql_parts = [f'text ~ "{escaped_query}"', "type = page"]
        if space_key:
            cql_parts.append(f'space = "{space_key}"')
        cql = " and ".join(cql_parts)

        data = self._get(
            "/rest/api/content/search",
            params={
                "cql": cql,
                "limit": limit,
                "expand": "space,excerpt",
            },
        )
        return [self._parse_search_result(item) for item in data.get("results", [])]

    def get_page_content(self, page_id: str) -> ConfluencePage:
        """Fetch the full content of a Confluence page by ID.

        Args:
            page_id: The Confluence page ID (e.g. ``"123456"``).

        Returns:
            A :class:`ConfluencePage` with ``body`` populated as plain text
            (converted from Confluence's HTML storage format).

        Raises:
            ConfluenceClientError: If the page is not found or the API call fails.
        """
        data = self._get(
            f"/rest/api/content/{page_id}",
            params={"expand": "body.storage,space,version"},
        )
        return self._parse_page(data)

    # ── Parsing helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _parse_search_result(data: dict[str, Any]) -> ConfluencePage:
        space = data.get("space") or {}
        excerpt = data.get("excerpt")
        return ConfluencePage(
            id=data["id"],
            title=data.get("title", ""),
            space_key=space.get("key", ""),
            url=(data.get("_links") or {}).get("webui", ""),
            excerpt=ConfluenceClient._clean_text(excerpt) if excerpt else None,
        )

    @staticmethod
    def _parse_page(data: dict[str, Any]) -> ConfluencePage:
        space = data.get("space") or {}
        version = (data.get("version") or {}).get("number")
        storage_html = ((data.get("body") or {}).get("storage") or {}).get("value")
        return ConfluencePage(
            id=data["id"],
            title=data.get("title", ""),
            space_key=space.get("key", ""),
            url=(data.get("_links") or {}).get("webui", ""),
            version=version,
            body=ConfluenceClient._clean_text(storage_html) if storage_html else None,
        )

    @staticmethod
    def _clean_text(raw: str) -> str:
        """Strip Confluence storage-format HTML/highlight markup to plain text.

        Not a full HTML parser — good enough for reading page content and
        search excerpts, not for round-tripping markup.
        """
        text = raw.replace("@@@hl@@@", "").replace("@@@endhl@@@", "")
        text = re.sub(r"<br\s*/?>", "\n", text)
        text = re.sub(r"</p>|</li>|</h[1-6]>|</tr>", "\n", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
