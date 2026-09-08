# jira_client

A reusable Python client for the Jira Cloud REST and Agile APIs, with a natural-language CLI agent.
Importable into any agent, service, or MCP server in this workspace.

---

## Setup

### 1. Install dependencies

```bash
pip install -r jira_client/requirements.txt
```

### 2. Configure credentials

Copy the example file and fill in your values:

```bash
cp jira_client/.env.example .env   # or append to the existing workspace .env
```

| Variable | Required | Description |
|---|---|---|
| `JIRA_BASE_URL` | ✓ | Your Atlassian Cloud base URL, e.g. `https://<your-org>.atlassian.net` |
| `JIRA_API_TOKEN` | ✓ | Atlassian API token — generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `DEV_EMAIL` | ✓ | Your email (also used as the Jira Basic Auth username) |

> `DEV_EMAIL` is already defined in the global `.env.template`. Only `JIRA_BASE_URL` and `JIRA_API_TOKEN` are new.

---

## CLI Usage

Start the interactive agent from the workspace root:

```bash
python -m jira_client.agent
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
jira> help
jira> exit
```

The agent caches the active board ID and sprint ID within a session — subsequent commands that need them will reuse cached values.

---

## Programmatic Usage

```python
from jira_client import JiraClient, config

# Validate env vars (exits with a clear message if missing)
config.validate()

client = JiraClient()

# Fetch active sprint
sprint = client.get_active_sprint(board_id=123)

# All issues in the sprint
issues = client.get_sprint_issues(sprint.id)

# Sprint health report
report = client.get_sprint_report(board_id=123, sprint_id=sprint.id)
print(f"Completion: {report.completion_pct:.1f}%")

# Blockers
blockers = client.get_blockers(sprint.id)

# Transition an issue
client.transition_issue("PROJ-3456", "Done")

# Add a comment
client.add_comment("PROJ-3456", "Deployed to dev — ready for QA.")
```

---

## Project Structure

```
jira_client/
├── __init__.py                # Public API surface
├── config.py                  # Env var loading and validation
├── jira_client.py             # JiraClient class (all API methods)
├── agent.py                   # Interactive CLI agent loop
├── models.py                  # Dataclasses: Sprint, Issue, SprintReport, Blocker
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
| `401` | Raises `JiraClientError` with auth troubleshooting hint |
| `403` | Raises `JiraClientError` with permission hint |
| `404` | Raises `JiraClientError` with resource hint |
| `429` | Retries up to 3 times with exponential backoff, then raises |

All errors are caught in the CLI loop and printed without crashing the agent.

---

## Adopting this in your own repo

`fetch_my_stories.py` and `fetch_sprint_stories.py` have a hardcoded `BOARD_ID`
(and `PROJECT`) placeholder at the top — fill those in with your own Jira
board ID and project key. The `@intake` agent's "Ticket Auto-Fetch" section
(`.github/agents/intake.agent.md`) also uses this client to pull ticket details
directly into story intake.
