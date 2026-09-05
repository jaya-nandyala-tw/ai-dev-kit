"""
agent.py — CLI agent loop with natural-language intent parsing.

Run:
    python -m jira_client.agent

Or directly:
    python jira_client/agent.py
"""

from __future__ import annotations

import re

from . import config
from .jira_client import JiraClient, JiraClientError
from .utils import print_blockers, print_issues, print_sprint_report, print_transitions

# ── Intent patterns ───────────────────────────────────────────────────────────
# Each entry: (compiled regex, handler name)
# Patterns are evaluated in order; first match wins.

_BOARD_RE = re.compile(r"\b(\d+)\b")
_ISSUE_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")
_COMMENT_RE = re.compile(
    r"add\s+comment\s+to\s+([A-Z][A-Z0-9]+-\d+)[:\s]+(.+)", re.IGNORECASE
)
_TRANSITION_RE = re.compile(r"move\s+([A-Z][A-Z0-9]+-\d+)\s+to\s+(.+)", re.IGNORECASE)

_HELP_TEXT = """\
Available commands:
  active sprint [board <id>]          Show the active sprint for a board
  sprint report [board <id>]          Full sprint health summary
  blockers                            List blocked / high-priority issues
  issues                              List all issues in the active sprint
  my issues [project <KEY>]           Stories assigned to you (open only)
  my issues in progress               Your in-progress stories
  move <KEY> to <Status>              Transition an issue to a new status
  transitions <KEY>                   Show available transitions for an issue
  add comment to <KEY>: <text>        Add a comment to an issue
  help                                Show this message
  exit / quit                         Exit the agent
"""

# State persisted across loop iterations
# GENERICIZED TEMPLATE — fill in your own default board ID / project key,
# or leave board_id as None to require "board <id>" on the first command.
_state: dict[str, int | None] = {
    "board_id": None,
    "sprint_id": None,
}
_DEFAULT_PROJECT = "PROJ"


def _require_board(client: JiraClient, raw: str) -> int:
    """Return the board ID from the command text or cached state.

    Args:
        client: Active :class:`JiraClient` (unused here; kept for symmetry).
        raw: The raw command string.

    Returns:
        A board ID integer.

    Raises:
        ValueError: If no board ID is available from either source.
    """
    m = _BOARD_RE.search(raw)
    if m:
        board_id = int(m.group(1))
        _state["board_id"] = board_id
        return board_id
    if _state["board_id"]:
        return _state["board_id"]  # type: ignore[return-value]
    raise ValueError("No board ID provided. Try: 'active sprint for board 123'")


def _require_sprint(client: JiraClient, board_id: int) -> int:
    """Return the cached sprint ID, fetching the active sprint if needed.

    Args:
        client: Active :class:`JiraClient`.
        board_id: The Jira board ID.

    Returns:
        A sprint ID integer.
    """
    if not _state["sprint_id"]:
        sprint = client.get_active_sprint(board_id)
        _state["sprint_id"] = sprint.id
        print(f"  → Active sprint: [{sprint.id}] {sprint.name}\n")
    return _state["sprint_id"]  # type: ignore[return-value]


# ── Command handlers ──────────────────────────────────────────────────────────


def _handle_active_sprint(client: JiraClient, raw: str) -> None:
    board_id = _require_board(client, raw)
    sprint = client.get_active_sprint(board_id)
    _state["sprint_id"] = sprint.id
    from .utils import fmt_date

    print(
        f"\n  Sprint : {sprint.name}\n"
        f"  State  : {sprint.state.upper()}\n"
        f"  Start  : {fmt_date(sprint.start_date)}\n"
        f"  End    : {fmt_date(sprint.end_date)}\n"
        f"  Goal   : {sprint.goal or '—'}\n"
        f"  ID     : {sprint.id}\n"
    )


def _handle_sprint_report(client: JiraClient, raw: str) -> None:
    board_id = _require_board(client, raw)
    sprint_id = _require_sprint(client, board_id)
    report = client.get_sprint_report(board_id, sprint_id)
    print_sprint_report(report)


def _handle_blockers(client: JiraClient, raw: str) -> None:
    board_id = _require_board(client, raw)
    sprint_id = _require_sprint(client, board_id)
    blockers = client.get_blockers(sprint_id)
    print_blockers(blockers)


def _handle_issues(client: JiraClient, raw: str) -> None:
    board_id = _require_board(client, raw)
    sprint_id = _require_sprint(client, board_id)
    issues = client.get_sprint_issues(sprint_id)
    print_issues(issues)


def _handle_transitions(client: JiraClient, raw: str) -> None:
    m = _ISSUE_RE.search(raw)
    if not m:
        print("  Provide an issue key, e.g.: transitions PROJ-3456")
        return
    issue_key = m.group(1)
    transitions = client.get_transitions(issue_key)
    print_transitions(
        [{"id": t.id, "name": t.name, "to_status": t.to_status} for t in transitions]
    )


def _handle_transition(client: JiraClient, raw: str) -> None:
    m = _TRANSITION_RE.search(raw)
    if not m:
        print("  Usage: move <KEY> to <Status>  (e.g. move PROJ-3456 to Done)")
        return
    issue_key, target = m.group(1).upper(), m.group(2).strip()
    client.transition_issue(issue_key, target)
    print(f"  ✓ {issue_key} moved to '{target}'.")


def _handle_add_comment(client: JiraClient, raw: str) -> None:
    m = _COMMENT_RE.search(raw)
    if not m:
        print("  Usage: add comment to <KEY>: <text>")
        return
    issue_key, text = m.group(1).upper(), m.group(2).strip()
    client.add_comment(issue_key, text)
    print(f"  ✓ Comment added to {issue_key}.")


_PROJECT_RE = re.compile(r"\bproject\s+([A-Z][A-Z0-9]+)\b", re.IGNORECASE)
_STATUS_WORDS_RE = re.compile(
    r"\b(in[- ]progress|in[- ]review|to[- ]?do|done|blocked)\b", re.IGNORECASE
)
_STATUS_MAP = {
    "in-progress": "In Progress",
    "in progress": "In Progress",
    "in-review": "In Review",
    "in review": "In Review",
    "to-do": "To Do",
    "todo": "To Do",
    "done": "Done",
    "blocked": "Blocked",
}


def _handle_my_issues(client: JiraClient, raw: str) -> None:
    project_m = _PROJECT_RE.search(raw)
    # Fall back to the workspace default project when not specified
    project = project_m.group(1).upper() if project_m else _DEFAULT_PROJECT

    status_m = _STATUS_WORDS_RE.search(raw)
    status = (
        _STATUS_MAP.get(status_m.group(1).lower().replace(" ", "-"))
        if status_m
        else None
    )

    # Resolve active sprint so results are scoped to the current sprint
    if _state["board_id"] and not _state["sprint_id"]:
        try:
            sprint = client.get_active_sprint(_state["board_id"])  # type: ignore[arg-type]
            _state["sprint_id"] = sprint.id
        except Exception:  # noqa: BLE001
            pass
    sprint_id: int | None = _state["sprint_id"]

    issues = client.get_my_issues(project=project, status=status, sprint_id=sprint_id)
    label = f"my open issues in {project}"
    if sprint_id:
        label += f" (sprint {sprint_id})"
    if status:
        label += f" [{status}]"
    print(f"\n  {len(issues)} {label}\n")
    print_issues(issues)


# ── Intent router ─────────────────────────────────────────────────────────────

_ROUTES: list[tuple[re.Pattern[str], object]] = [
    (re.compile(r"\badd\s+comment\b", re.I), _handle_add_comment),
    (re.compile(r"\bmove\b.+\bto\b", re.I), _handle_transition),
    (re.compile(r"\btransitions?\b", re.I), _handle_transitions),
    (re.compile(r"\bblockers?\b", re.I), _handle_blockers),
    (re.compile(r"\bsprint\s+report\b|\breport\b", re.I), _handle_sprint_report),
    (re.compile(r"\bactive\s+sprint\b|\bshow.*sprint\b", re.I), _handle_active_sprint),
    # 'my issues' / 'assigned to me' must come before the generic 'issues' route
    (
        re.compile(
            r"\bmy\s+(?:issues?|stories|tickets?)\b|\bassigned\s+to\s+me\b", re.I
        ),
        _handle_my_issues,
    ),
    (re.compile(r"\bissues?\b|\btickets?\b", re.I), _handle_issues),
]


def _dispatch(client: JiraClient, raw: str) -> bool:
    """Route *raw* to the appropriate handler.

    Returns:
        ``False`` when the user wants to exit, ``True`` otherwise.
    """
    stripped = raw.strip()
    if not stripped:
        return True
    lower = stripped.lower()

    if lower in {"exit", "quit", "q", "bye"}:
        print("Goodbye.")
        return False

    if lower in {"help", "?", "h"}:
        print(_HELP_TEXT)
        return True

    # board / sprint override so users can switch context mid-session
    board_m = re.search(r"\bboard\s+(\d+)\b", lower)
    if board_m:
        _state["board_id"] = int(board_m.group(1))
        _state["sprint_id"] = None  # reset cached sprint when board changes

    for pattern, handler in _ROUTES:
        if pattern.search(stripped):
            handler(client, stripped)  # type: ignore[operator]
            return True

    print("  Unrecognised command. Type 'help' to see available commands.")
    return True


# ── Entry point ───────────────────────────────────────────────────────────────


def main() -> None:
    """Start the interactive Jira CLI agent."""
    config.validate()
    client = JiraClient()

    print("Jira Agent — type 'help' for commands, 'exit' to quit.\n")

    while True:
        try:
            raw = input("jira> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nInterrupted. Goodbye.")
            break

        try:
            if not _dispatch(client, raw):
                break
        except JiraClientError as exc:
            print(f"  ERROR: {exc}")
        except Exception as exc:  # noqa: BLE001
            print(f"  Unexpected error: {exc}")


if __name__ == "__main__":
    main()
