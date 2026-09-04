"""
__init__.py — jira_client package entry-point.

Exposes the public API surface so consumers can do:

    from jira_client import JiraClient, config
    from jira_client.models import Sprint, Issue, SprintReport
"""

from . import config
from .jira_client import JiraClient, JiraClientError

__all__ = ["JiraClient", "JiraClientError", "config"]
