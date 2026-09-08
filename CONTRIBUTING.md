# Contributing

This repo is a shared starter kit — changes here affect every team that clones or forks it. Keep that in mind more than you would for a normal product repo.

## Ground rule: stay portal-agnostic

Nothing in this repo should reference a specific product, service name, repo, or business flow. If you're extracting something from your own project into this kit, generalize it first:

- Replace real ticket IDs with `TICKET-XXXX`.
- Replace real repo/service names with `codebase/<service>/`.
- Replace real spec paths with `specs/<domain>/`.
- Replace concrete "earned rules" (a specific bug, a specific stack quirk) with a labeled `EXAMPLE:` bullet showing the *shape* of the rule, not the literal incident.

If content can't be generalized without losing its value, it probably doesn't belong in this kit — keep it in your own project's fork instead.

## Proposing a new agent or skill

1. Open an issue first (use the feature request template) describing the workflow gap this fills and confirming it's generic enough for other teams.
2. Follow the existing structure: agents go in `.github/agents/*.agent.md`, skills in `.github/skills/<name>/SKILL.md`.
3. Include the placeholder conventions above wherever the content would otherwise need a real path or name.
4. Open a PR using the PR template and check the "portal-agnostic" box honestly.

## Proposing a change to an existing agent/skill/instructions file

Small clarifications and bug fixes can go straight to a PR. Larger behavioral changes (new guardrails, changed phase flow, new required fields) should get an issue first so other adopting teams can weigh in — a change here potentially breaks every downstream fork's workflow.

## Dev tooling changes (`scripts/`, `jira_client/`)

Keep these framework/stack-agnostic where possible. If a script only makes sense for one stack (e.g. AWS-specific), say so clearly in its header comment rather than presenting it as universal.
