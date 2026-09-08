# atlassian_client

A reusable Python client for the Atlassian Cloud REST APIs — Jira (sprints, issues, transitions,
comments) and Confluence (read-only page search and content). Ships with a natural-language CLI
agent for both. Importable into any agent, service, or MCP server in this workspace.

---

## Setup

### 1. Install dependencies

```bash
pip install -r atlassian_client/requirements.txt
```

### 2. Configure credentials

Copy the example file and fill in your values:

```bash
cp atlassian_client/.env.example .env   # or append to the existing workspace .env
```

| Variable | Required | Description |
|---|---|---|
| `JIRA_BASE_URL` | ✓ | Your Atlassian Cloud base URL, e.g. `https://<your-org>.atlassian.net` |
| `JIRA_API_TOKEN` | ✓ | Atlassian API token — generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens). Shared by Jira and Confluence. |
| `DEV_EMAIL` | ✓ | Your email (also used as the Atlassian Basic Auth username) |
| `CONFLUENCE_BASE_URL` | – | Only needed if Confluence lives on a different site than Jira. Defaults to `<JIRA_BASE_URL>/wiki`. |

> `DEV_EMAIL` is already defined in the global `.env.template`. Only `JIRA_BASE_URL` and `JIRA_API_TOKEN` are new, and both credentials are reused for Confluence — no separate token needed.

---

## CLI Usage

Start the interactive agent from the workspace root:

```bash
python -m atlassian_client.agent
```

### Example commands

```
jira> active sprint for board 123
jira> sprint report
jira> blockers
jira> issues
jira> move PROJ-3456 to Done
jira> transitions PROJ-3456
jira> add comment to PROJ-3456: Deployed to dev — ready for QA
jira> confluence onboarding runbook
jira> confluence page 123456
jira> help
jira> exit
```

The agent caches the active board ID and sprint ID within a session — subsequent commands that need them will reuse cached values.

---

## Programmatic Usage

```python
from atlassian_client import JiraClient, ConfluenceClient, config

# Validate env vars (exits with a clear message if missing)
config.validate()

jira = JiraClient()

# Fetch active sprint
sprint = jira.get_active_sprint(board_id=123)

# All issues in the sprint
issues = jira.get_sprint_issues(sprint.id)

# Sprint health report
report = jira.get_sprint_report(board_id=123, sprint_id=sprint.id)
print(f"Completion: {report.completion_pct:.1f}%")

# Blockers
blockers = jira.get_blockers(sprint.id)

# Transition an issue
jira.transition_issue("PROJ-3456", "Done")

# Add a comment
jira.add_comment("PROJ-3456", "Deployed to dev — ready for QA.")

# ── Confluence (read-only) ──
confluence = ConfluenceClient()

# Search pages by text
results = confluence.search_pages("onboarding runbook", space_key="ENG")

# Load full page content (plain text, converted from storage-format HTML)
page = confluence.get_page_content(results[0].id)
print(page.title, page.body)
```

---

## Project Structure

```
atlassian_client/
├── __init__.py                # Public API surface
├── config.py                  # Env var loading and validation
├── base_client.py             # Shared HTTP/auth/retry base (Jira + Confluence)
├── jira_client.py             # JiraClient class (all Jira API methods)
├── confluence_client.py       # ConfluenceClient class (read-only: search, page content)
├── agent.py                   # Interactive CLI agent loop (Jira + Confluence)
├── models.py                  # Dataclasses: Sprint, Issue, SprintReport, Blocker, ConfluencePage, ...
├── utils.py                   # Table formatting and date helpers
├── fetch_my_stories.py        # One-shot script — fill in your board ID/project
├── fetch_sprint_stories.py    # One-shot script — fill in your board ID
├── requirements.txt           # Runtime dependencies
├── .env.example                # Local credential template
└── README.md                  # This file
```

---

## Error Handling

| HTTP Status | Behaviour |
|---|---|
| `401` | Raises `AtlassianClientError` with auth troubleshooting hint |
| `403` | Raises `AtlassianClientError` with permission hint |
| `404` | Raises `AtlassianClientError` with resource hint |
| `429` | Retries up to 3 times with exponential backoff, then raises |

`JiraClientError` and `ConfluenceClientError` are the same exception type as `AtlassianClientError`
— use whichever name reads better at the call site. All errors are caught in the CLI loop and
printed without crashing the agent.

---

## Confluence integration is read-only

`ConfluenceClient` only exposes `search_pages()` and `get_page_content()` — there are no
create/update/delete methods. This is intentional: the integration is meant for pulling existing
documentation into context (e.g. for the Acquire Context workflow), not for writing back to
Confluence.

---

## Adopting this in your own repo

`fetch_my_stories.py` and `fetch_sprint_stories.py` have a hardcoded `BOARD_ID`
(and `PROJECT`) placeholder at the top — fill those in with your own Jira
board ID and project key. The `@intake` agent's "Ticket Auto-Fetch" section
(`.github/agents/intake.agent.md`) also uses this client to pull ticket details
directly into story intake.
