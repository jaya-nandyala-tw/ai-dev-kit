---
name: address-pr-comments
description: "Triage and address PR review comments. Categorizes comments into 'Should Fix' vs 'Should Clarify with Reply' based on project constitutions, then generates a TODO list with fixes or reply drafts."
argument-hint: "Paste PR review comments or provide PR URL"
---

<!--
GENERICIZED TEMPLATE — this skill's triage procedure is portal-agnostic, but the
"Should Fix" / "Should Clarify" criteria and the reply templates below were tuned to one
specific codebase's conventions. Before using this for real:
  1. Rewrite the criteria under "Categorize Each Comment" with YOUR codebase's actual
     known patterns/anti-patterns (see examples inline, marked <example>).
  2. Replace the "Common Fix Patterns" section with your own recurring fix recipes, or
     delete it if you don't have any yet.
  3. Point "Load Context" at your own constitution/spec files.
-->

# Address PR Comments

Triage PR review comments against established project patterns, then fix or draft replies.

## When to Use
- After receiving PR review comments (human or bot/Copilot)
- When you need to decide which comments are valid bugs vs over-engineering
- When you want to batch-fix multiple review comments efficiently

## Procedure

### 1. Collect Inputs
Ask for or receive:
- **PR comments** (pasted text with file paths + line references + comment body)
- **Story/branch context** (ticket number, plan file if exists in `plans/`)

### 2. Load Context
Before triaging, read:
- The **constitution / conventions doc** for the affected area, e.g. `specs/<domain>/<layer>-constitution.md`
  <!-- fill in with your own per-layer constitution paths, e.g. specs/<service>/ui-constitution.md -->
- The **plan file** for the story (if exists in `plans/TICKET-XXXX-*.md`)
- The **actual files** referenced in the comments (to understand current implementation)

### 3. Categorize Each Comment

For each review comment, evaluate against these criteria:

#### "Should Fix" — Comment is valid if:
- Points out a **real bug** (wrong types, unreachable code, null safety)
- Identifies a **pattern violation** from your constitutions (e.g., using deprecated libs, wrong file placement)
- Catches a **type mismatch** between migrated types (e.g., string → array but clearing with `""`)
- Points out **duplicate DOM IDs** or accessibility issues
- Identifies **security issues** that are genuinely exploitable in your deployment model
- <example>Add your own codebase-specific recurring bug classes here (e.g. a known form-library integration issue, a known state-migration gotcha).</example>

#### "Should Clarify with Reply" — Comment should be pushed back if:
- Suggests adding **extra flags/guards** for code paths that only run in local dev (over-engineering)
- Recommends changes that are impractical for local developer experience
- Asks for changes that contradict your **established patterns**
- Suggests **scope creep** beyond the story (e.g., "also handle X")
- Misunderstands the **deployment model**
- Proposes **abstractions** for one-time, local-only code paths

### 4. Generate TODO List

Output a structured analysis:

```markdown
## Should Fix

| # | File | Issue | Fix Description |
|---|---|---|---|
| 1 | path/to/file.tsx | Brief issue | What to change |

## Should Clarify with Reply

| # | File | Comment Summary | Reply Draft |
|---|---|---|---|
| 1 | path/to/file.py | "Add extra flag" | "This follows our established local-dev pattern..." |
```

### 5. Implement Fixes

For each "Should Fix" item:
1. Read the file to get full context
2. Apply the minimal fix (don't refactor unrelated code)
3. If your codebase has any parallel/duplicated trees that must stay in sync, fix both — document that convention in your own constitution and reference it here
4. Verify no TypeScript/lint errors after fixing

### 6. Draft Replies

For each "Should Clarify with Reply" item, draft a concise reply that:
- Acknowledges the concern
- References the specific pattern/decision that justifies current approach
- Offers a minimal compromise if appropriate

## Reply Templates

<!-- Replace these with your own team's recurring justifications. -->

### Scope Creep
> Valid observation, but this is outside the scope of TICKET-XXXX. Filed as tech debt / follow-up. Current implementation handles the happy path which covers our acceptance criteria.

### Over-Engineering for Local-Only Code
> This code only runs during local development and is guarded by environment checks. The deployed application never exercises this path. Adding [suggested change] would add complexity without production benefit.

## Common Fix Patterns

<!-- <example> This section held one team's specific React Hook Form + MUI Autocomplete
recipe and a "dual-tree fix" rule from their old codebase layout. Replace it with your own
team's recurring fix recipes as you discover them — or delete this section until you have some. -->

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, or PII in reply drafts or fix descriptions. Replace with `[REDACTED]`
- **Reference, don't repeat** — cite constitution rules by section name/path rather than quoting them verbatim in replies
- **Keep replies concise** — reply drafts should be 2-4 sentences max; link to docs for full justification
- **Minimal fixes only** — do not refactor unrelated code while fixing review comments
- **Respect existing patterns** — if a comment contradicts an established codebase convention, push back with a reference to the governing rule
