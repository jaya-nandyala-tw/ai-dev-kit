---
name: plan-story
description: "Generate a per-repo implementation plan from a ticket or feature. Use when starting a new story, breaking down a feature into tasks, or creating a technical plan for a ticket."
argument-hint: "TICKET-XXXX story description"
---

<!--
GENERICIZED TEMPLATE — this is the master plan-generation procedure and is the backbone of
the whole harness (the `implement`/`verify`/`git` agents all key off the plan file this
produces). The skeleton (collect inputs → load specs → clarifying questions → acceptance
criteria as sensors → plan file with Status/Steering Log → optional sub-sections) is generic
and worth keeping as-is. What needs filling in for your own repo:
  - Section 2 "Load Context": your own specs/ tree paths.
  - The "Toggle scope" question and "Visual Design" section assume a frontend with a feature-
    toggle system and MUI — adapt or delete if your stack differs.
  - "Mock Data" section paths are placeholders — point them at your own mock/seed layer.
  - The ticket ID convention (TICKET-XXXX, BUG-XXXX, HOTFIX-XXXX, SPIKE-XXXX) — swap for
    your own tracker's key format.
-->

# Plan Story

Generate a repo-by-repo implementation plan for a story or multi-story feature.

## When to Use
- Starting a new story
- Breaking a feature into per-repo tasks
- Creating a technical plan before coding

## Procedure

### 1. Collect Inputs
Ask for:
- **Ticket number**: `TICKET-XXXX`
- **Story description** and acceptance criteria
- **Scope-defining question(s) specific to your stack** (e.g. feature-toggle scope, target environment, API version)

### 2. Load Context
Read these specs before planning — fill in your own spec tree, e.g.:
- `specs/<service>/project-composition.md` — code placement, architecture pattern
- `specs/<service>/ui-specs.md` — UI-focused architecture and references
- `specs/<service>/service-specs.md` — backend-focused architecture and references
- `specs/product/feature-inventory.md` — is this new or existing?
- `specs/<service>/branching-strategy.md` — branch/commit conventions

If UI changes: read `specs/<service>/component-map.md`
If backend changes: read `specs/<service>/api-contracts.md`, `specs/<service>/data-models.md`
If infra/worker changes: read `specs/<layer>/dependency-map.md`

### 3. Search Codebase
Find existing files related to the feature domain. Understand what already exists.

### 4. Ask Clarifying Questions
- Any stack-specific scope questions (toggle scope, environment, versioning)?
- New endpoint or extend existing?
- New DB model or new fields?
- Which repos are affected?

### 4.5. Derive Acceptance Criteria

**Before writing the implementation order**, translate each story acceptance criterion into a sensor row in `## Acceptance Criteria`:

- **Criterion** — the exact condition from the story AC (copy verbatim, do not rephrase)
- **Layer** — UI, Service, Worker/Lambda, or IaC
- **Sensor Command** — the smallest runnable command that proves the criterion passes:
  - Service: `pytest -xvs tests/path/test_file.py::test_function_name`
  - UI: `npm test -- --watchAll=false --testPathPattern=ComponentName`
  - Worker/Lambda: `cd codebase/<worker-name> && tox -e unit` <!-- adjust to your test runner -->
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
| {stack-specific scope question} | {answer} |
| API changes | New endpoint / Extend existing / None |
| DB changes | New model / New fields / None |
| Repos affected | <service-name>, <worker-name>, <iac-repo-name> |

## Acceptance Criteria

> Defined at intake — before any implementation begins. Each criterion maps to a concrete sensor so done-ness is machine-verifiable, not self-assessed.

| # | Criterion | Layer | Sensor Command | Test File |
|---|---|---|---|---|
| 1 | {Condition from story AC} | UI / Service / Worker | `{pytest / npm test command}` | `{path/to/test file}` |

## Git
- Branch: `TICKET-XXXX-{short-title}`
- Commit prefix: `TICKET-XXXX |`

## Implementation Order

### Repo 1: <service-name>
| # | Commit | Files |
|---|---|---|
| 1 | `TICKET-XXXX | {description}` | file list |

### Repo 2: <ui-name> (if separate from Repo 1)
| # | Commit | Files |
|---|---|---|
| 1 | `TICKET-XXXX | {description}` | file list |

### Repo 3: Worker/Lambda (if needed)
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

### Feature Toggle Task (only if your stack uses feature toggles)

If a feature toggle was confirmed in clarifying questions, **Task 0 in the plan must be the feature toggle setup** — completed before any feature work begins. If you maintain a `/new-feature-toggle` skill for your own toggle architecture, invoke it here to generate end-to-end setup.

Skip if the developer opted out (bug fix, refactor, backend-only, or non-user-facing change), or if your stack has no toggle system.

---

### Visual Design (UI stories only — adapt to your own design system)

Include when the story involves a new screen, dialog/modal/drawer, table or list view, significant layout change, or multi-step form. Skip for backend-only, infra-only, or non-visual changes.

**How to produce:**
1. Search codebase for similar screens — identify the component library/patterns used
2. Follow your own design system's spacing/typography/color conventions
3. Produce ASCII/text wireframe showing layout, components, data fields, and actions

**Template:**

```markdown
## Visual Design

### Layout
[ASCII wireframe or structured description]

### Components
| Component | Variant/Props | Purpose |
|---|---|---|
| <DataTable> | pagination, sortable columns | Display records |
| <Button> | variant="primary" | Submit action |

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

Evaluate whether mock or seed data needs adding for local development. Fill in your own mock/seed layer's paths and conventions, e.g.:

| Change Type | Location | Action |
|---|---|---|
| New/modified backend endpoint calling an external API | `<service>/mock-service/<external-api>/` | Add/update mock handler |
| New DB model or fields | `db/seed.sql` | Add seed data |
| New feature toggle | `db/seed.sql` | Add to seed INSERT |

Skip for pure refactors, style changes, or test-only stories.

### Spike Plan Template

Used when `@intake`'s Phase 0 classification is "Tech design / spike" — formalizes a `TICKET-SPIKE-*`
naming convention. Save to `plans/active/TICKET-SPIKE-{short-name}.md`.

```markdown
# Spike: TICKET-SPIKE-XXXX — {Decision Title}

> {One-line summary of the decision that needs resolving}

## Decision Framing
What question does this spike answer, and which future story or epic does it unblock?

## Options Considered
| Option | Pros | Cons |
|---|---|---|
| A. {option} | | |
| B. {option} | | |

## Recommendation
{Which option, and why}

## Open Questions
- {anything still unresolved}

## Unblocks
- {story/epic ticket(s) waiting on this decision}

## Status
| Field | Value |
|---|---|
| Phase | planning / approved / in-progress / done |

## Steering Log
<!-- Append entries here whenever scope, decisions, or direction changes -->
```

If the spike sits under an existing epic (`plans/epics/{EPIC-KEY}.md` exists), link it into that
epic's child-story table the same way a story would be.

### Bug/Hotfix Plan Template

Used when `@intake`'s Phase 0 classification is "Bug fix / hotfix." Save to
`plans/active/BUG-{short-name}.md` or `plans/active/HOTFIX-{short-name}.md`. Deliberately lightweight
— but **still mandatory**, even on the fast path where shared infra isn't touched and Interrogation is
skipped: no path should let code get written with zero durable artifact.

```markdown
# Bug/Hotfix: BUG-XXXX — {One-line description}

> {Urgent hotfix or standard bug ticket}

## Extends / Epic
{ticket, epic key, or "none" — only set if this bug touches an existing feature/epic}

## Acceptance Criteria
| # | Criterion | Sensor Command |
|---|---|---|
| 1 | Regression test proves the fix | `{test command}` |

## Git
- Branch: `BUG-XXXX-{short-title}` / `HOTFIX-XXXX-{short-title}`
- Commit prefix: `BUG-XXXX |` / `HOTFIX-XXXX |`

## Status
| Field | Value |
|---|---|
| Phase | planning / approved / in-progress / review / closing / done |

## Pending Approval
| # | Repo | Commit | Files |
|---|---|---|---|
| 1 | {Repo} | `BUG-XXXX \| {description}` | {file1} |

## Steering Log
<!-- Append entries here whenever scope, decisions, or direction changes -->
```

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, connection strings, or PII in plan files. Use `[REDACTED]` or environment variable references
- **Reference, don't repeat** — link to existing specs/constitutions by path rather than copying their content into the plan
- **Keep plans actionable** — every row in the implementation table should map to a single commit; avoid vague "refactor" steps
- **No scope creep** — only plan what the story's acceptance criteria require; flag adjacent improvements as follow-up
- **Respect existing patterns** — follow your codebase's architecture and toggle rules from constitutions; justify any deviation in the Decisions table
