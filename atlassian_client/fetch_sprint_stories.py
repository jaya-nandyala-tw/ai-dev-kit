"""
fetch_sprint_stories.py — Fetch all stories in the active sprint for
your team's board.

GENERICIZED TEMPLATE — fill in BOARD_ID for your own Jira board.

Run from the workspace root:
    python -m atlassian_client.fetch_sprint_stories
"""

from __future__ import annotations

from collections import defaultdict

from . import config
from .jira_client import JiraClient, JiraClientError
from .models import Issue
from .utils import fmt_date, print_issues, print_sprint_report

BOARD_ID = 0  # fill in your board ID


def _group_by_status(issues: list[Issue]) -> dict[str, list[Issue]]:
    groups: dict[str, list[Issue]] = defaultdict(list)
    for issue in issues:
        groups[issue.status].append(issue)
    return dict(groups)


# Status display order
_STATUS_ORDER = [
    "In Progress",
    "In Review",
    "Blocked",
    "To Do",
    "Draft",
    "Done",
]


def main() -> None:
    config.validate()
    client = JiraClient()

    # ── Active sprint ────────────────────────────────────────────────────────
    try:
        sprint = client.get_active_sprint(BOARD_ID)
    except JiraClientError as exc:
        print(f"ERROR: Could not fetch active sprint — {exc}")
        return

    print(
        f"\n── Active Sprint ───────────────────────────────────────────────\n"
        f"  {sprint.name}  |  {fmt_date(sprint.start_date)} → {fmt_date(sprint.end_date)}\n"
        f"  Goal: {sprint.goal or '—'}\n"
    )

    # ── All sprint issues ────────────────────────────────────────────────────
    try:
        issues = client.get_sprint_issues(sprint.id)
    except JiraClientError as exc:
        print(f"ERROR: Could not fetch sprint issues — {exc}")
        return

    print(
        f"── All Sprint Stories ({len(issues)} total) ─────────────────────────────────"
    )
    groups = _group_by_status(issues)

    printed: set[str] = set()
    ordered_statuses = _STATUS_ORDER + sorted(
        s for s in groups if s not in _STATUS_ORDER
    )

    for status in ordered_statuses:
        if status not in groups:
            continue
        bucket = groups[status]
        print(f"\n  [{status}] — {len(bucket)} issue(s)")
        print_issues(bucket)
        printed.add(status)

    # ── Sprint health report ─────────────────────────────────────────────────
    print(f"\n── Sprint Health Report ─────────────────────────────────────────")
    try:
        report = client.get_sprint_report(BOARD_ID, sprint.id)
        print_sprint_report(report)
    except JiraClientError as exc:
        print(f"  ERROR: {exc}")


if __name__ == "__main__":
    main()
