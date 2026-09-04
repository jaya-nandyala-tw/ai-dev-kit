---
name: doc-garden
description: "Audit completed story plans and code for spec drift, ask clarifying questions, and apply targeted updates to keep specs in sync with the codebase."
argument-hint: "TICKET-XXXX ticket numbers, or 'all' to scan every plan in plans/"
---

# Doc Garden

Detect and close the gap between the codebase and living documentation after stories are implemented.

## When to Use
- After one or more story branches merge and plan files exist in `plans/`
- When a developer asks "are the specs still accurate?"
- Before a sprint retro or doc day — batch catch-up pass

---

## Procedure

### 1. Identify Scope

Ask the developer:
> Which plans should I review — all files in `plans/`, or specific `TICKET-XXXX` tickets?

(`TICKET-XXXX` is a placeholder — replace with your tracker's ticket ID convention.)

List the matching plan files and confirm before proceeding.

---

### 2. Ingest Plan Files

For each plan in `plans/{file}.md`, extract:

- Ticket number + story title
- Decisions table (scope, API changes, DB changes, affected repos)
- Implementation order — file lists per commit
- Any new components, endpoints, data models, or design patterns introduced
- Any decisions that deviate from prior conventions

---

### 3. Spot-Check Code

For each plan, read 1-3 of the primary implementation files to confirm decisions were carried through. Note any divergences between plan intent and code reality — flag these for developer clarification, not automatic spec updates.

---

### 4. Gap Analysis

**Before starting gap analysis, write a session checkpoint** to `/memories/session/garden-progress.md`:

```markdown
# Doc Garden — In Progress
Date: {date}
Plans reviewed: TICKET-XXXX, TICKET-YYYY, ...
Gap report: {paste the Explore gap report here}
Status: gap-analysis | awaiting-answers | applying-updates | done
```

This lets the session be resumed if the context window fills before updates are applied.

Then load only the specs that intersect the reviewed plans, then compare. Replace the table
below with your own spec tree layout — this is illustrative:

<!-- TEMPLATE: define your own specs/<domain>/*.md tree and list which spec covers which kind of change -->
| Spec | What to Check |
|---|---|
| `specs/product/business-workflows.md` | New or modified user-facing flows |
| `specs/product/feature-inventory.md` | New features / toggles with correct status |
| `specs/<domain>/api-contracts.md` | New endpoints (method, path, request, response) |
| `specs/<domain>/data-models.md` | New tables, columns, or schema changes |
| `specs/<domain>/component-map.md` | New screens, routes, or major components |
| `specs/<domain>/ui-constitution.md` | New UI patterns requiring a new rule |
| `specs/<domain>/service-constitution.md` | New backend patterns requiring a new rule |
| `specs/<domain>/iac-constitution.md` | New infra patterns or module conventions |

Produce a gap list per spec file:
```
### gaps: specs/<domain>/api-contracts.md
- MISSING: GET /api/v1/widgets — introduced in TICKET-7683
- STALE: POST /api/v1/workspaces — required fields changed in TICKET-XXXX
```

Only flag gaps directly traceable to the reviewed plans.

---

### 5. Ask Clarifying Questions

Before writing any updates, ask about:

1. Any ambiguous code-vs-plan divergences
2. Intentional omissions ("was this left out of the spec on purpose?")
3. Scope of updates for large new workflows ("full section or a stub pending follow-on?")
4. Whether future stories will own parts of the gap

Ask all questions at once. **Do not proceed until answered.**

---

### 6. Apply Updates

Make the smallest edit that closes each confirmed gap:

- **New endpoint** → add a table row (method, path, auth, request, response, ticket ID)
- **New feature/toggle** → add a row (name, status, toggle, owning team, ticket ID)
- **New screen/route** → add route path, component name, file path, toggle gate, ticket ID
- **New business flow** → add numbered steps under the relevant domain section (or a new section)
- **Constitution update** → only when a new *governing* pattern is introduced; cite the ticket ID

Use the existing formatting style of the target file. Never delete accurate content.

---

### 7. Output Summary

```markdown
## Doc Garden Summary — {date}

### Plans Reviewed
- TICKET-XXXX — {title}

### Specs Updated
| Spec | Changes |
|---|---|
| specs/<domain>/api-contracts.md | Added 2 endpoints |

### Deferred Gaps
| Gap | Reason |
|---|---|
| business-workflows — Widget flow | Awaiting follow-on story |

### Divergences Found
| Plan | Divergence | Action |
|---|---|---|
| TICKET-7683 | Code uses `initialValue`, plan specified `content` prop | Flagged to developer |

### No-Impact Plans
- TICKET-XXXX — {title} (bug fix, no new contracts or patterns)
```

---

## Constraints

- Never delete spec content that is still accurate
- Never invent context — every update must be traceable to a plan or code file you read
- Never update a spec for a plan you have not fully read
- Ask before writing — clarifying questions (step 5) are mandatory
- Update constitutions only for new *governing* patterns, not for individual features
- **Redact sensitive information** — strip API keys, passwords, tokens, connection strings, or PII from any spec content. Replace with `[REDACTED]` or generic placeholders
- **Reference, don't repeat** — when a plan file already documents a decision, link to it by path rather than duplicating content into the spec
