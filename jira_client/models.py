"""
models.py — Dataclasses for Sprint, Issue, SprintReport, and Blocker.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Sprint:
    """Represents a Jira sprint."""

    id: int
    name: str
    state: str  # "active" | "closed" | "future"
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    board_id: int
    goal: Optional[str] = None


@dataclass
class Issue:
    """Represents a single Jira issue inside a sprint."""

    key: str
    summary: str
    status: str
    assignee: Optional[str]
    story_points: Optional[float]
    priority: str
    issue_type: str
    created: Optional[datetime] = None
    updated: Optional[datetime] = None
    status_changed: Optional[datetime] = None


@dataclass
class SprintReport:
    """Aggregated health summary for a sprint."""

    sprint: Sprint
    total_issues: int
    completed: int
    in_progress: int
    todo: int
    blocked: int
    points_committed: float
    points_completed: float
    completion_pct: float  # 0–100


@dataclass
class Blocker:
    """A sprint issue identified as a blocker."""

    key: str
    summary: str
    assignee: Optional[str]
    priority: str
    days_in_status: int
    status: str


@dataclass
class Transition:
    """An available workflow transition for an issue."""

    id: str
    name: str
    to_status: str


@dataclass
class SprintIssueCollection:
    """All issues in a sprint plus the sprint metadata."""

    sprint: Sprint
    issues: list[Issue] = field(default_factory=list)


@dataclass
class StoryDetail:
    """Full detail of a single Jira issue for story planning.

    Extends beyond the sprint-level Issue dataclass to include
    description and acceptance criteria needed by the @story agent.
    """

    key: str
    summary: str
    status: str
    assignee: Optional[str]
    story_points: Optional[float]
    priority: str
    issue_type: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    labels: list[str] = field(default_factory=list)
    components: list[str] = field(default_factory=list)
    epic_key: Optional[str] = None
    epic_name: Optional[str] = None
    parent_key: Optional[str] = None
    created: Optional[datetime] = None
    updated: Optional[datetime] = None
