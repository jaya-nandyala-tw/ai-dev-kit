"""
__init__.py — atlassian_client package entry-point.

Exposes the public API surface so consumers can do:

    from atlassian_client import JiraClient, ConfluenceClient, config
    from atlassian_client.models import Sprint, Issue, SprintReport, ConfluencePage
"""

from . import config
from .base_client import AtlassianClientError
from .confluence_client import ConfluenceClient, ConfluenceClientError
from .jira_client import JiraClient, JiraClientError

__all__ = [
    "JiraClient",
    "JiraClientError",
    "ConfluenceClient",
    "ConfluenceClientError",
    "AtlassianClientError",
    "config",
]
