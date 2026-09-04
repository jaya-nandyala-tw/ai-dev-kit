---
name: plan-story
description: "Generate a per-repo implementation plan from a ticket or feature. Use when starting a new story, breaking down a feature into tasks, or creating a technical plan for a ticket."
argument-hint: "TICKET-XXXX story description"
---

# Plan Story

Generate a repo-by-repo implementation plan for a story or multi-story feature.

`TICKET-XXXX` below is a placeholder for your tracker's ticket ID convention (e.g. `JIRA-123`, `GH-456`) — replace consistently wherever it appears in generated plan files.

## When to Use
- Starting a new story
- Breaking a feature into per-repo tasks
- Creating a technical plan before coding

## Procedure

### 1. Collect Inputs
Ask for:
- **Ticket number**: `TICKET-XXXX`
- **Story description** and acceptance criteria
- Any scope flags specific to your stack (e.g. flag-gated vs always-on, which environments)

### 2. Load Context

<!-- TEMPLATE: replace this spec tree with your own. The pattern is: route by topic to a spec file
     instead of loading everything. Define specs/<domain>/*.md for your own codebase's domains. -->
Read these specs before planning:
- `specs/<domain>/project-composition.md` — code placement and architecture conventions
- `specs/<domain>/ui-specs.md` — UI-focused architecture and references
- `specs/<domain>/service-specs.md` — backend-focused architecture and references
- `specs/product/feature-inventory.md` — is this new or existing?
- `specs/<domain>/branching-strategy.md` — branch/commit conventions

If UI changes: read `specs/<domain>/component-map.md`
If backend changes: read `specs/<domain>/api-contracts.md`, `specs/<domain>/data-models.md`
If infra changes: read `specs/<domain>/dependency-map.md`

### 3. Search Codebase
Find existing files related to the feature domain. Understand what already exists.

### 4. Ask Clarifying Questions
- Any relevant scope/rollout flags (feature toggle, environment gating)?
- New endpoint or extend existing?
- New DB model or new fields?
- Which repos/services are affected?

### 4.5. Derive Acceptance Criteria

**Before writing the implementation order**, translate each story acceptance criterion into a sensor row in `## Acceptance Criteria`:

- **Criterion** — the exact condition from the story AC (copy verbatim, do not rephrase)
- **Layer** — UI, Service, Lambda/Function, or IaC (adapt to your own stack's layers)
- **Sensor Command** — the smallest runnable command that proves the criterion passes. Fill in your own stack's commands, e.g.:
  - Service: `pytest -xvs tests/path/test_file.py::test_function_name`
  - UI: `npm test -- --watchAll=false --testPathPattern=ComponentName`
  - Function/Lambda: `cd codebase/<service-name> && tox -e unit`
  - IaC: `terraform validate`
- **Test File** — the specific file the sensor runs against (create a placeholder path if the file doesn't exist yet)

If no automated sensor is possible for a criterion (e.g. visual/UX acceptance), mark the Sensor Command as `manual — {description of how to verify}`.

Every criterion must have a row. A plan with empty Acceptance Criteria is incomplete.

### 5. Generate Plan

Save to `plans/active/TICKET-XXXX-{short-name}.md` using this structure:

```markdown
# Plan: TICKET-XXXX — {Story Title}

> {One-line summary}

## Decisions
| Question | Answer |
|---|---|
| Scope/rollout | e.g. flag-gated / always-on |
| API changes | New endpoint / Extend existing / None |
| DB changes | New model / New fields / None |
| Repos affected | codebase/<service-a>, codebase/<service-b> |

## Acceptance Criteria

> Defined at intake — before any implementation begins. Each criterion maps to a concrete sensor so done-ness is machine-verifiable, not self-assessed.

| # | Criterion | Layer | Sensor Command | Test File |
|---|---|---|---|---|
| 1 | {Condition from story AC} | UI / Service / IaC | `{pytest / npm test command}` | `{path/to/test file}` |

## Git
- Branch: `TICKET-XXXX-{short-title}`
- Commit prefix: `TICKET-XXXX |`

## Implementation Order

### Repo 1: <service-name> (service)
| # | Commit | Files |
|---|---|---|
| 1 | `TICKET-XXXX | {description}` | file list |

### Repo 2: <service-name> (UI)
| # | Commit | Files |
|---|---|---|
| 1 | `TICKET-XXXX | {description}` | file list |

### Repo 3: <service-name> (if needed)
### Repo 4: IaC (if needed)

## Test Plan
| Layer | What to Test | File |
|---|---|---|

## PR Sequence
| # | Repo | Deploy Action |
|---|---|---|

## Status
| Field | Value |
|---|---|
| Phase | planning / approved / in-progress / review / done |
| Current repo | — |
| Completed commits | 0 of N |
| Blocked on | — |

## Pending Approval

> This section is the approval surface for `@story` Phase 4.5. Update it whenever tasks change. Clear the `[ ]` boxes to `[x]` as tasks complete.

| # | Repo | Commit | Files |
|---|---|---|---|
| 1 | {Repo} | `TICKET-XXXX \| {description}` | {file1}, {file2} |

## Steering Log
<!-- Append entries here whenever scope, decisions, or direction changes -->
<!-- Format: - YYYY-MM-DD — {what changed and why} -->
```

For multi-story features, save to `plans/active/feature-{short-name}.md` with a section per story and a dependency graph.

---

### Feature Toggle / Rollout-Gate Task (if applicable)

If your stack uses feature toggles/flags and one was confirmed in clarifying questions, **Task 0 in the plan should be the toggle/flag setup** — completed before any feature work begins. Adopters with their own "new toggle" scaffolding skill can reference it here (e.g. `/new-feature-toggle`) to generate the end-to-end setup for their stack.

Skip if the developer opted out (bug fix, refactor, backend-only, or non-user-facing change).

---

### Visual Design (UI stories only)

Include when the story involves a new screen, dialog/modal/drawer, table or list view, significant layout change, or multi-step form. Skip for backend-only, infra-only, or non-visual changes.

**How to produce:**
1. Search codebase for similar screens — identify which UI component library/patterns are used
2. Follow your team's design system conventions (spacing grid, typography scale, color semantics)
3. Produce ASCII/text wireframe showing layout, components, data fields, and actions

**Template:**

```markdown
## Visual Design

### Layout
[ASCII wireframe or structured description]

### Components
| Component | Variant/Props | Purpose |
|---|---|---|
| DataGrid | pagination, sortable columns | Display records |
| Button | variant="primary" | Submit action |

### States
- **Empty:** [description]
- **Loading:** [skeleton/spinner approach]
- **Error:** [alert placement]
- **Populated:** [default view]

### Interactions
- [Click action] → [result]
- [Hover] → [tooltip/highlight]
```

---

### Mock Data

Evaluate whether mock or seed data needs adding for local development.

<!-- TEMPLATE: replace this table with your own stack's mock/seed data locations. -->
| Change Type | Location | Action |
|---|---|---|
| New/modified backend endpoint calling an external API | `service/mock-service/<external>/` | Add/update mock handler |
| New DB model or fields | `db/seed.sql` | Add seed data |
| New feature toggle | `db/seed.sql` | Add to seed INSERT |

Skip for pure refactors, style changes, or test-only stories.

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, connection strings, or PII in plan files. Use `[REDACTED]` or environment variable references
- **Reference, don't repeat** — link to existing specs/constitutions by path rather than copying their content into the plan
- **Keep plans actionable** — every row in the implementation table should map to a single commit; avoid vague "refactor" steps
- **No scope creep** — only plan what the story's acceptance criteria require; flag adjacent improvements as follow-up
- **Respect existing patterns** — follow your architecture and rollout-gating conventions; justify any deviation in the Decisions table
