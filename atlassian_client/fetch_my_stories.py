"""
fetch_my_stories.py — One-shot script to fetch stories assigned to you
on your team's board.

GENERICIZED TEMPLATE — fill in BOARD_ID and PROJECT for your own Jira board.

Run from the workspace root:
    python -m atlassian_client.fetch_my_stories
"""

from __future__ import annotations

from . import config
from .jira_client import JiraClient, JiraClientError
from .utils import fmt_date, print_issues, print_sprint_report

BOARD_ID = 0  # fill in your board ID
PROJECT = "PROJ"  # fill in your Jira project key


def main() -> None:
    config.validate()
    client = JiraClient()

    # ── Active sprint ────────────────────────────────────────────────────────
    try:
        sprint = client.get_active_sprint(BOARD_ID)
        print(
            f"\n── Active Sprint ───────────────────────────────────────────────\n"
            f"  {sprint.name}  |  {fmt_date(sprint.start_date)} → {fmt_date(sprint.end_date)}\n"
            f"  Goal: {sprint.goal or '—'}\n"
        )
    except JiraClientError as exc:
        print(f"  Could not fetch active sprint: {exc}\n")
        sprint = None

    # ── My open issues in this project ───────────────────────────────────────
    print(f"── My Open Issues in {PROJECT} ─────────────────────────")
    try:
        issues = client.get_my_issues(
            project=PROJECT,
            sprint_id=sprint.id if sprint else None,
        )
        if not issues:
            print("  No open issues assigned to you in the current sprint.\n")
        else:
            print(f"  {len(issues)} issue(s) found\n")
            print_issues(issues)
    except JiraClientError as exc:
        print(f"  ERROR: {exc}")

    # ── Sprint report (if active sprint found) ───────────────────────────────
    if sprint:
        print(f"\n── Sprint Health Report ─────────────────────────────────────────")
        try:
            report = client.get_sprint_report(BOARD_ID, sprint.id)
            print_sprint_report(report)
        except JiraClientError as exc:
            print(f"  ERROR: {exc}")


if __name__ == "__main__":
    main()
