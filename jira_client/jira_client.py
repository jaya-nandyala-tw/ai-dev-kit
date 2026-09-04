"""
jira_client.py — JiraClient: reusable Atlassian REST API client.

Supports Jira Cloud Agile (v1) and REST (v3) endpoints.
Authentication: Basic Auth with email + API token.
Retry logic: exponential backoff on HTTP 429.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

from . import config
from .models import (
    Blocker,
    Issue,
    Sprint,
    SprintIssueCollection,
    SprintReport,
    StoryDetail,
    Transition,
)
from .utils import days_since, parse_jira_date

# ── Constants ─────────────────────────────────────────────────────────────────

_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 1.0  # seconds

_DONE_STATUSES = {"done", "closed", "resolved", "complete", "completed"}
_IN_PROGRESS_STATUSES = {"in progress", "in review", "in development", "review"}
_BLOCKED_STATUSES = {"blocked"}
_BLOCKER_PRIORITIES = {"highest", "blocker"}

_STORY_POINT_FIELDS = (
    "story_points",
    "customfield_10016",  # most common Jira Cloud field
    "customfield_10028",
    "customfield_10014",
)


class JiraClientError(Exception):
    """Raised for unrecoverable Jira API errors."""


class JiraClient:
    """Thin, reusable wrapper around the Jira Cloud REST and Agile APIs.

    Usage::

        client = JiraClient()
        sprint = client.get_active_sprint(board_id=42)
        report = client.get_sprint_report(board_id=42, sprint_id=sprint.id)

    The client reads credentials from environment variables via :mod:`config`.
    Call :func:`config.validate` before instantiating in CLI entry-points.
    """

    def __init__(self) -> None:
        self._base_url = config.base_url()
        self._auth = HTTPBasicAuth(config.user_email(), config.api_token())
        self._session = requests.Session()
        self._session.auth = self._auth
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
            JiraClientError: On 401, 403, 404, or unrecoverable errors.
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
                raise JiraClientError(
                    "Rate limit exceeded and max retries reached. "
                    "Try again in a few minutes."
                )

            if response.status_code == 401:
                raise JiraClientError(
                    "Authentication failed (401). Check JIRA_API_TOKEN and DEV_EMAIL."
                )
            if response.status_code == 403:
                raise JiraClientError(
                    f"Permission denied (403) for {url}. "
                    "Ensure your account has the required Jira permissions."
                )
            if response.status_code == 404:
                raise JiraClientError(
                    f"Resource not found (404): {url}. "
                    "Verify board ID, sprint ID, or issue key."
                )
            if response.status_code == 410:
                raise JiraClientError(
                    f"Endpoint removed (410): {url}. "
                    "The Jira Cloud API has been updated — this endpoint no longer exists."
                )

            response.raise_for_status()

            if response.status_code == 204 or not response.content:
                return None
            return response.json()

        raise JiraClientError("Unexpected retry loop exit.")  # pragma: no cover

    # ── Sprint helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _parse_sprint(data: dict[str, Any], board_id: int) -> Sprint:
        """Map a raw Jira sprint dict to a :class:`Sprint` dataclass."""
        return Sprint(
            id=data["id"],
            name=data["name"],
            state=data.get("state", "unknown"),
            start_date=parse_jira_date(data.get("startDate")),
            end_date=parse_jira_date(data.get("endDate")),
            board_id=board_id,
            goal=data.get("goal") or None,
        )

    @staticmethod
    def _extract_story_points(fields: dict[str, Any]) -> float | None:
        """Return story points from a Jira issue's fields dict."""
        for field_name in _STORY_POINT_FIELDS:
            val = fields.get(field_name)
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    continue
        return None

    @staticmethod
    def _parse_issue(data: dict[str, Any]) -> Issue:
        """Map a raw Jira issue dict to an :class:`Issue` dataclass."""
        fields = data.get("fields", {})
        assignee_data = fields.get("assignee") or {}
        assignee = assignee_data.get("displayName") or assignee_data.get("emailAddress")
        status_data = fields.get("status", {})
        status_category = (status_data.get("statusCategory") or {}).get("name", "")
        status_name = status_data.get("name", "Unknown")

        # status_changed: most accurate is statusCategoryChangedDate or updated
        status_changed_raw = fields.get("statuscategorychangedate") or fields.get(
            "updated"
        )

        return Issue(
            key=data["key"],
            summary=fields.get("summary", ""),
            status=status_name,
            assignee=assignee,
            story_points=JiraClient._extract_story_points(fields),
            priority=(fields.get("priority") or {}).get("name", "Medium"),
            issue_type=(fields.get("issuetype") or {}).get("name", "Story"),
            created=parse_jira_date(fields.get("created")),
            updated=parse_jira_date(fields.get("updated")),
            status_changed=parse_jira_date(status_changed_raw),
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def get_active_sprint(self, board_id: int) -> Sprint:
        """Fetch the currently active sprint for a Jira board.

        Args:
            board_id: The numeric ID of the Jira board.

        Returns:
            A :class:`Sprint` instance representing the active sprint.

        Raises:
            JiraClientError: If no active sprint is found or the API call fails.
        """
        data = self._get(
            f"/rest/agile/1.0/board/{board_id}/sprint",
            params={"state": "active"},
        )
        values: list[dict[str, Any]] = data.get("values", [])
        if not values:
            raise JiraClientError(f"No active sprint found for board {board_id}.")
        return self._parse_sprint(values[0], board_id)

    def get_sprint_issues(self, sprint_id: int) -> list[Issue]:
        """Retrieve all issues in a sprint with key fields.

        Paginates automatically (Jira default page size is 50).

        Args:
            sprint_id: The numeric sprint ID.

        Returns:
            A list of :class:`Issue` dataclasses.
        """
        issues: list[Issue] = []
        start_at = 0
        page_size = 100
        fields = (
            "summary,status,assignee,priority,issuetype,created,updated,"
            "statuscategorychangedate," + ",".join(_STORY_POINT_FIELDS)
        )

        while True:
            data = self._get(
                f"/rest/agile/1.0/sprint/{sprint_id}/issue",
                params={
                    "startAt": start_at,
                    "maxResults": page_size,
                    "fields": fields,
                },
            )
            batch: list[dict[str, Any]] = data.get("issues", [])
            issues.extend(self._parse_issue(item) for item in batch)

            total: int = data.get("total", 0)
            start_at += len(batch)
            if start_at >= total or not batch:
                break

        return issues

    def get_sprint_report(self, board_id: int, sprint_id: int) -> SprintReport:
        """Generate a sprint health summary.

        Args:
            board_id: The numeric board ID (used to fetch sprint metadata).
            sprint_id: The numeric sprint ID.

        Returns:
            A :class:`SprintReport` with issue counts and story-point totals.
        """
        # Fetch sprint metadata
        sprint_data = self._get(f"/rest/agile/1.0/sprint/{sprint_id}")
        sprint = self._parse_sprint(sprint_data, board_id)

        issues = self.get_sprint_issues(sprint_id)

        completed = in_progress = todo = blocked = 0
        points_committed = points_completed = 0.0

        for issue in issues:
            status_lower = issue.status.lower()
            points = issue.story_points or 0.0
            points_committed += points

            if status_lower in _DONE_STATUSES:
                completed += 1
                points_completed += points
            elif status_lower in _IN_PROGRESS_STATUSES:
                in_progress += 1
            elif status_lower in _BLOCKED_STATUSES:
                blocked += 1
            else:
                todo += 1

        total = len(issues)
        completion_pct = (completed / total * 100) if total else 0.0

        return SprintReport(
            sprint=sprint,
            total_issues=total,
            completed=completed,
            in_progress=in_progress,
            todo=todo,
            blocked=blocked,
            points_committed=points_committed,
            points_completed=points_completed,
            completion_pct=completion_pct,
        )

    def get_blockers(self, sprint_id: int) -> list[Blocker]:
        """Return sprint issues that are blocked or have blocker-level priority.

        An issue is a blocker when:
        - Its status name (lowercased) is in ``_BLOCKED_STATUSES``, **or**
        - Its priority name (lowercased) is in ``_BLOCKER_PRIORITIES``.

        Args:
            sprint_id: The numeric sprint ID.

        Returns:
            A list of :class:`Blocker` dataclasses.
        """
        issues = self.get_sprint_issues(sprint_id)
        blockers: list[Blocker] = []

        for issue in issues:
            is_blocked_status = issue.status.lower() in _BLOCKED_STATUSES
            is_blocker_priority = issue.priority.lower() in _BLOCKER_PRIORITIES

            if is_blocked_status or is_blocker_priority:
                blockers.append(
                    Blocker(
                        key=issue.key,
                        summary=issue.summary,
                        assignee=issue.assignee,
                        priority=issue.priority,
                        days_in_status=days_since(issue.status_changed),
                        status=issue.status,
                    )
                )

        return blockers

    def get_transitions(self, issue_key: str) -> list[Transition]:
        """Fetch available workflow transitions for a Jira issue.

        Args:
            issue_key: The Jira issue key (e.g. ``PROJ-3456``).

        Returns:
            A list of :class:`Transition` dataclasses.
        """
        data = self._get(f"/rest/api/3/issue/{issue_key}/transitions")
        return [
            Transition(
                id=t["id"],
                name=t["name"],
                to_status=t.get("to", {}).get("name", "Unknown"),
            )
            for t in data.get("transitions", [])
        ]

    def transition_issue(self, issue_key: str, transition_name: str) -> None:
        """Move an issue to a new status by transition name.

        The lookup is case-insensitive. Fetches available transitions first,
        then POSTs the matching one.

        Args:
            issue_key: The Jira issue key (e.g. ``PROJ-3456``).
            transition_name: Human-readable target status name (e.g. ``"Done"``).

        Raises:
            JiraClientError: If no transition matching *transition_name* exists.
        """
        transitions = self.get_transitions(issue_key)
        name_lower = transition_name.lower()
        match = next((t for t in transitions if t.name.lower() == name_lower), None)
        if match is None:
            available = ", ".join(t.name for t in transitions)
            raise JiraClientError(
                f"No transition named '{transition_name}' found for {issue_key}. "
                f"Available: {available}"
            )
        self._post(
            f"/rest/api/3/issue/{issue_key}/transitions",
            body={"transition": {"id": match.id}},
        )

    def get_my_issues(
        self,
        project: str | None = None,
        status: str | None = None,
        sprint_id: int | None = None,
        max_results: int = 50,
    ) -> list[Issue]:
        """Fetch open issues assigned to the authenticated user.

        Uses JQL ``assignee = currentUser()`` so the result always reflects
        the account identified by :envvar:`DEV_EMAIL`.

        Args:
            project:   Optional Jira project key to narrow results (e.g. ``"PROJ"``).
                       When omitted, all projects are searched.
            status:    Optional status filter (e.g. ``"In Progress"``).
                       When omitted, all non-done statuses are returned.
            sprint_id: Optional sprint ID to restrict results to a specific sprint.
                       When provided, only issues in that sprint are returned.
            max_results: Maximum number of issues to return (default 50).

        Returns:
            A list of :class:`Issue` dataclasses ordered by updated date descending.
        """
        jql_parts = ["assignee = currentUser()"]
        if project:
            jql_parts.append(f'project = "{project}"')
        if sprint_id:
            jql_parts.append(f"sprint = {sprint_id}")
            jql_parts.append("statusCategory != Done")
        jql_parts.append("ORDER BY updated DESC")

        jql = " AND ".join(jql_parts[:-1]) + " " + jql_parts[-1]

        issues: list[Issue] = []
        next_page_token: str | None = None
        page_size = min(max_results, 100)
        fields_list = [
            "summary",
            "status",
            "assignee",
            "priority",
            "issuetype",
            "created",
            "updated",
            "statuscategorychangedate",
            *_STORY_POINT_FIELDS,
        ]

        while len(issues) < max_results:
            # POST /rest/api/3/search/jql — cursor-based pagination (no startAt)
            body: dict[str, Any] = {
                "jql": jql,
                "maxResults": page_size,
                "fields": fields_list,
            }
            if next_page_token:
                body["nextPageToken"] = next_page_token

            data = self._post("/rest/api/3/search/jql", body=body)
            batch: list[dict[str, Any]] = data.get("issues", [])
            issues.extend(self._parse_issue(item) for item in batch)

            next_page_token = data.get("nextPageToken")
            if not next_page_token or not batch:
                break

        return issues[:max_results]

    def add_comment(self, issue_key: str, comment_text: str) -> None:
        """Add a plain-text comment to a Jira issue using ADF.

        Args:
            issue_key: The Jira issue key (e.g. ``PROJ-3456``).
            comment_text: The comment body as plain text.
        """
        adf_body: dict[str, Any] = {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": comment_text,
                            }
                        ],
                    }
                ],
            }
        }
        self._post(f"/rest/api/3/issue/{issue_key}/comment", body=adf_body)

    def get_issue(self, issue_key: str) -> StoryDetail:
        """Fetch full detail for a single Jira issue (story/task/bug).

        Retrieves the description, acceptance criteria, labels, components,
        and epic linkage needed for story planning.

        Args:
            issue_key: The Jira issue key (e.g. ``PROJ-8083``).

        Returns:
            A :class:`StoryDetail` dataclass with full story content.

        Raises:
            JiraClientError: If the issue is not found or the API call fails.
        """
        fields = (
            "summary,status,assignee,priority,issuetype,description,"
            "labels,components,parent,created,updated,"
            + ",".join(_STORY_POINT_FIELDS)
            + ",customfield_10014"  # epic link (classic)
        )
        data = self._get(
            f"/rest/api/3/issue/{issue_key}",
            params={"fields": fields},
        )

        fields_data = data.get("fields", {})
        assignee_data = fields_data.get("assignee") or {}
        assignee = assignee_data.get("displayName") or assignee_data.get("emailAddress")
        status_data = fields_data.get("status", {})

        # Extract description — Jira Cloud uses ADF (Atlassian Document Format)
        description_raw = fields_data.get("description")
        description = self._adf_to_text(description_raw) if description_raw else None

        # Extract acceptance criteria from description (common pattern: "## Acceptance Criteria" section)
        acceptance_criteria = self._extract_acceptance_criteria(description)

        # Labels and components
        labels = fields_data.get("labels", [])
        components = [c.get("name", "") for c in fields_data.get("components", [])]

        # Epic/parent linkage
        parent_data = fields_data.get("parent") or {}
        parent_key = parent_data.get("key")
        epic_name = (parent_data.get("fields") or {}).get("summary")
        # Fallback to customfield_10014 (classic epic link)
        epic_key = fields_data.get("customfield_10014") or parent_key

        return StoryDetail(
            key=data["key"],
            summary=fields_data.get("summary", ""),
            status=status_data.get("name", "Unknown"),
            assignee=assignee,
            story_points=self._extract_story_points(fields_data),
            priority=(fields_data.get("priority") or {}).get("name", "Medium"),
            issue_type=(fields_data.get("issuetype") or {}).get("name", "Story"),
            description=description,
            acceptance_criteria=acceptance_criteria,
            labels=labels,
            components=components,
            epic_key=epic_key,
            epic_name=epic_name,
            parent_key=parent_key,
            created=parse_jira_date(fields_data.get("created")),
            updated=parse_jira_date(fields_data.get("updated")),
        )

    @staticmethod
    def _adf_to_text(adf: dict[str, Any] | None) -> str:
        """Convert Atlassian Document Format (ADF) to plain text.

        Handles common node types: paragraph, heading, text, bulletList,
        orderedList, listItem, codeBlock, table, hardBreak.
        """
        if not adf:
            return ""

        def walk(node: dict[str, Any], depth: int = 0) -> str:
            node_type = node.get("type", "")
            content = node.get("content", [])

            if node_type == "text":
                return node.get("text", "")
            if node_type == "hardBreak":
                return "\n"
            if node_type == "heading":
                level = node.get("attrs", {}).get("level", 1)
                text = "".join(walk(c, depth) for c in content)
                return f"{'#' * level} {text}\n"
            if node_type == "paragraph":
                text = "".join(walk(c, depth) for c in content)
                return f"{text}\n"
            if node_type in ("bulletList", "orderedList"):
                lines = []
                for i, item in enumerate(content):
                    prefix = f"{i + 1}. " if node_type == "orderedList" else "- "
                    item_text = "".join(walk(c, depth + 1) for c in item.get("content", []))
                    lines.append(f"{prefix}{item_text.strip()}")
                return "\n".join(lines) + "\n"
            if node_type == "listItem":
                return "".join(walk(c, depth) for c in content)
            if node_type == "codeBlock":
                text = "".join(walk(c, depth) for c in content)
                return f"```\n{text}```\n"
            if node_type == "table":
                rows = []
                for row in content:
                    cells = []
                    for cell in row.get("content", []):
                        cell_text = "".join(walk(c, depth) for c in cell.get("content", []))
                        cells.append(cell_text.strip())
                    rows.append(" | ".join(cells))
                return "\n".join(rows) + "\n"

            # Default: recurse into content
            return "".join(walk(c, depth) for c in content)

        return walk(adf).strip()

    @staticmethod
    def _extract_acceptance_criteria(description: str | None) -> str | None:
        """Extract acceptance criteria section from a description.

        Looks for common headers like 'Acceptance Criteria', 'AC:', or
        'Definition of Done' and returns everything below that header
        until the next heading or end of text.
        """
        if not description:
            return None

        import re

        # Match common AC header patterns
        pattern = r"(?:^|\n)#{1,3}\s*(?:Acceptance\s*Criteria|AC|Definition\s*of\s*Done)[:\s]*\n(.*?)(?=\n#{1,3}\s|\Z)"
        match = re.search(pattern, description, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()

        return None
