"""
utils.py — Table formatting and date helpers for the Jira CLI agent.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from tabulate import tabulate

from .models import Blocker, ConfluencePage, Issue, SprintReport

# ── Date helpers ─────────────────────────────────────────────────────────────

_JIRA_DATE_FORMATS = (
    "%Y-%m-%dT%H:%M:%S.%f%z",
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%d",
)


def parse_jira_date(value: str | None) -> datetime | None:
    """Parse a Jira ISO-8601 date string into a timezone-aware datetime.

    Returns None when *value* is empty or unparseable.
    """
    if not value:
        return None
    for fmt in _JIRA_DATE_FORMATS:
        try:
            dt = datetime.strptime(value, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def days_since(dt: datetime | None) -> int:
    """Return the number of whole days elapsed since *dt* (UTC).

    Returns 0 when *dt* is None.
    """
    if dt is None:
        return 0
    now = datetime.now(tz=timezone.utc)
    return max(0, (now - dt).days)


def fmt_date(dt: datetime | None) -> str:
    """Format a datetime as ``YYYY-MM-DD`` or ``—`` when None."""
    if dt is None:
        return "—"
    return dt.strftime("%Y-%m-%d")


# ── Table printers ────────────────────────────────────────────────────────────

_TABLE_FMT = "rounded_outline"


def print_issues(issues: list[Issue]) -> None:
    """Pretty-print a list of issues as a terminal table."""
    rows: list[list[Any]] = [
        [
            i.key,
            i.summary[:60] + ("…" if len(i.summary) > 60 else ""),
            i.status,
            i.assignee or "Unassigned",
            i.story_points if i.story_points is not None else "—",
            i.priority,
        ]
        for i in issues
    ]
    headers = ["Key", "Summary", "Status", "Assignee", "Points", "Priority"]
    print(tabulate(rows, headers=headers, tablefmt=_TABLE_FMT))


def print_sprint_report(report: SprintReport) -> None:
    """Pretty-print a SprintReport summary."""
    sprint = report.sprint
    meta_rows = [
        ["Sprint", sprint.name],
        ["State", sprint.state.upper()],
        ["Start", fmt_date(sprint.start_date)],
        ["End", fmt_date(sprint.end_date)],
        ["Goal", sprint.goal or "—"],
    ]
    print("\n── Sprint Metadata ─────────────────────────────────────────")
    print(tabulate(meta_rows, tablefmt="plain"))

    stats_rows = [
        ["Total Issues", report.total_issues],
        ["✓ Completed", report.completed],
        ["⟳ In Progress", report.in_progress],
        ["○ To-Do", report.todo],
        ["✗ Blocked", report.blocked],
        ["Points Committed", report.points_committed],
        ["Points Completed", report.points_completed],
        ["Completion %", f"{report.completion_pct:.1f}%"],
    ]
    print("\n── Health Summary ──────────────────────────────────────────")
    print(tabulate(stats_rows, tablefmt="plain"))
    print()


def print_blockers(blockers: list[Blocker]) -> None:
    """Pretty-print a list of blockers as a terminal table."""
    if not blockers:
        print("No blockers found.")
        return
    rows: list[list[Any]] = [
        [
            b.key,
            b.summary[:55] + ("…" if len(b.summary) > 55 else ""),
            b.assignee or "Unassigned",
            b.priority,
            b.status,
            b.days_in_status,
        ]
        for b in blockers
    ]
    headers = ["Key", "Summary", "Assignee", "Priority", "Status", "Days Stuck"]
    print(tabulate(rows, headers=headers, tablefmt=_TABLE_FMT))


def print_transitions(transitions: list[dict[str, str]]) -> None:
    """Pretty-print available workflow transitions."""
    rows = [[t["id"], t["name"], t["to_status"]] for t in transitions]
    print(
        tabulate(
            rows, headers=["ID", "Transition", "Target Status"], tablefmt=_TABLE_FMT
        )
    )


def print_confluence_pages(pages: list[ConfluencePage]) -> None:
    """Pretty-print a list of Confluence pages (search results) as a table."""
    if not pages:
        print("No pages found.")
        return
    rows: list[list[Any]] = [
        [
            p.id,
            p.title[:60] + ("…" if len(p.title) > 60 else ""),
            p.space_key,
            (p.excerpt or "")[:60] + ("…" if p.excerpt and len(p.excerpt) > 60 else ""),
        ]
        for p in pages
    ]
    headers = ["ID", "Title", "Space", "Excerpt"]
    print(tabulate(rows, headers=headers, tablefmt=_TABLE_FMT))
