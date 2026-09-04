---
applyTo: "**"
description: "Global rules applied to every file in the workspace. Covers agent routing, memory hygiene, and completion sensors."
---

# Global Rules

<!--
  STARTER KIT TEMPLATE — this file ships with illustrative placeholders, not your repo's real
  structure. Before relying on it, fill in:
  - The memory index files under `/memories/repo/` that actually exist for your project.
  - The `codebase/<service>/` placement rules for your own services/apps.
  - The Sensor Dispatch Table with your own file globs and real test/lint commands.
  Everything below is the *pattern*, not the content — adapt it, don't just rename paths.
-->

## Memory Check (always first)
Before writing code or specs, check `/memories/repo/` for pre-indexed facts. Example index files —
replace with whatever your team actually maintains:
- `/memories/repo/routes.md` — UI routes and screen map
- `/memories/repo/api-index.md` — all API endpoints
- `/memories/repo/data-models.md` — DB tables and shapes
- `/memories/repo/toggles.md` — feature toggle registry (if your project uses feature flags)

Only read full spec files when the index lacks the required detail.

## Placement Rules

<!-- Replace this list with your own repo's real placement conventions. -->
- Frontend code → `codebase/<service>/ui/src/...` (state your team's actual convention here)
- Backend endpoints → your team's layout convention (e.g. router / service / DAO / DTO)
- Any read-only reference/POC directories → call them out explicitly and never edit them

## After Any Edit
Run the smallest relevant sensor before finalizing. Examples — replace with your stack's real commands:
- Python changes → `pytest -xvs` on the affected test file
- TypeScript/React changes → `npm test -- --watchAll=false --testPathPattern=<file>`
- Terraform changes → `terraform validate`

## Sensor Dispatch Table

Use a table like this to select the right sensor(s) based on which files changed. Fill in the `File
Pattern` and `Cwd` columns with your own services' real paths — the rows below are placeholders
illustrating the shape of the table, not literal paths to copy:

| File Pattern | Sensor Command | Cwd |
|---|---|---|
| `codebase/<service>/src/**/*.py` | `ruff check {file} && pytest -xvs tests/` | `codebase/<service>/` |
| `codebase/<service>/tests/**/*.py` | `pytest -xvs {file}` | `codebase/<service>/` |
| `codebase/<service>/ui/src/**/*.{ts,tsx}` | `npx tsc --noEmit && npm test -- --watchAll=false --testPathPattern={stem}` | `codebase/<service>/ui/` |
| `codebase/<iac-module>/**/*.tf` | `terraform fmt -check -recursive && terraform validate` | `codebase/<iac-module>/` |
| `codebase/<function>/src/**/*.py` | `cd {function_root} && tox -e unit` | `codebase/<function>/` |
| `codebase/<shared-layer>/**` | Run the test suite in ALL dependent services (check your dependency-map doc) | — |

When multiple patterns match (e.g. service src + tests changed), run **all** matching sensors.

## Epic Drift Check

See the `epic-drift-check` skill for the full procedure. Invoked **unconditionally** — not left to be
"noticed" — by `@story`/`@groom`/`@implement` any time a plan's `## Decisions` table changes and that
plan has a non-empty `Epic:` field. The skill reads the structured child-story index at
`plans/epics/{EPIC-KEY}.md`, not a free-text grep.

## Checkpoint / Plan Self-Consistency

Whenever any agent writes or updates a session checkpoint (`/memories/session/story-{TICKET-XXXX}.md`),
diff the checkpoint's `Phase`/`Workflow stage` line against the plan file's own `## Status` → `Phase`
value **before** finishing the write. If they disagree, flag the mismatch immediately and resolve it
in the same turn — do not persist a checkpoint that contradicts its plan file.

> **Origin:** found live in a real project (original ticket `PROJ-1234`) — the checkpoint read "9/10
> complete" in one place, "6/10 commits" nearby, and "IN PROGRESS — Task 1/10" further down, while the
> plan file itself had already moved on. Caught at write time here instead of at the next audit. Keep
> this callout style when you accumulate your own war stories — a concrete "here's the bug this
> prevents" is more durable than an abstract rule.
