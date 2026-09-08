"""
base_client.py — Shared HTTP/auth/retry base for Atlassian REST clients.

JiraClient and ConfluenceClient both authenticate against the same
Atlassian Cloud site with the same email + API token, and need identical
retry-on-429 and error-handling behaviour. This module centralizes that
so each product client only implements its own endpoints.
"""

from __future__ import annotations

import time
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

from . import config

_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 1.0  # seconds


class AtlassianClientError(Exception):
    """Raised for unrecoverable Atlassian API errors (Jira or Confluence)."""


class AtlassianRestClient:
    """Thin HTTP layer shared by Jira and Confluence clients.

    Handles Basic Auth (email + API token), retry-on-429 with exponential
    backoff, and consistent error messages for 401/403/404/410. Subclasses
    supply their own ``base_url`` and public API methods on top of
    :meth:`_get` / :meth:`_post`.
    """

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._session = requests.Session()
        self._session.auth = HTTPBasicAuth(config.user_email(), config.api_token())
        self._session.headers.update(
            {
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """Execute a GET request with retry on 429.

        Args:
            path: API path relative to the base URL (must start with ``/``).
            params: Optional query-string parameters.

        Returns:
            Parsed JSON response body.

        Raises:
            AtlassianClientError: On 401, 403, 404, 410, or unrecoverable errors.
        """
        url = f"{self._base_url}{path}"
        return self._request_with_retry("GET", url, params=params)

    def _post(self, path: str, body: dict[str, Any]) -> Any:
        """Execute a POST request with retry on 429.

        Args:
            path: API path relative to the base URL.
            body: JSON-serialisable request body.

        Returns:
            Parsed JSON response body (or ``None`` for 204 No Content).
        """
        url = f"{self._base_url}{path}"
        return self._request_with_retry("POST", url, json=body)

    def _request_with_retry(self, method: str, url: str, **kwargs: Any) -> Any:
        """Send an HTTP request, retrying up to *_MAX_RETRIES* times on 429."""
        delay = _RETRY_BASE_DELAY
        for attempt in range(_MAX_RETRIES + 1):
            response = self._session.request(method, url, **kwargs)

            if response.status_code == 429:
                retry_after = float(response.headers.get("Retry-After", delay))
                if attempt < _MAX_RETRIES:
                    time.sleep(retry_after)
                    delay *= 2
                    continue
                raise AtlassianClientError(
                    "Rate limit exceeded and max retries reached. "
                    "Try again in a few minutes."
                )

            if response.status_code == 401:
                raise AtlassianClientError(
                    "Authentication failed (401). Check JIRA_API_TOKEN and DEV_EMAIL."
                )
            if response.status_code == 403:
                raise AtlassianClientError(
                    f"Permission denied (403) for {url}. "
                    "Ensure your account has the required Atlassian permissions."
                )
            if response.status_code == 404:
                raise AtlassianClientError(
                    f"Resource not found (404): {url}. "
                    "Verify the ID/key and that the resource exists."
                )
            if response.status_code == 410:
                raise AtlassianClientError(
                    f"Endpoint removed (410): {url}. "
                    "The Atlassian Cloud API has been updated — this endpoint no longer exists."
                )

            response.raise_for_status()

            if response.status_code == 204 or not response.content:
                return None
            return response.json()

        raise AtlassianClientError("Unexpected retry loop exit.")  # pragma: no cover
