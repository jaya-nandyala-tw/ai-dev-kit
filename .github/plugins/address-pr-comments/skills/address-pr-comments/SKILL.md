---
name: address-pr-comments
description: "Triage and address PR review comments. Categorizes comments into 'Should Fix' vs 'Should Clarify with Reply' based on project constitutions, then generates a TODO list with fixes or reply drafts."
argument-hint: "Paste PR review comments or provide PR URL"
---

# Address PR Comments

Triage PR review comments against established project patterns, then fix or draft replies.

## When to Use
- After receiving PR review comments (human or bot reviewer)
- When you need to decide which comments are valid bugs vs over-engineering
- When you want to batch-fix multiple review comments efficiently

## Procedure

### 1. Collect Inputs
Ask for or receive:
- **PR comments** (pasted text with file paths + line references + comment body)
- **Story/branch context** (ticket number, plan file if exists in `plans/`)

### 2. Load Context
Before triaging, read:
- The **constitution** for the affected area. Replace with your own convention docs, e.g.:
  <!-- TEMPLATE: point these at your own constitution/convention files, one per codebase area -->
  - Frontend/UI: `specs/<domain>/ui-constitution.md`
  - Backend/service: `specs/<domain>/service-constitution.md`
  - Infra/IaC: `specs/<domain>/iac-constitution.md`
- The **plan file** for the story (if it exists in `plans/TICKET-XXXX-*.md`) — `TICKET-XXXX` is a placeholder for your tracker's ticket ID convention (e.g. `JIRA-123`, `GH-456`)
- The **actual files** referenced in the comments (to understand current implementation)

### 3. Categorize Each Comment

For each review comment, evaluate against these criteria:

#### "Should Fix" — Comment is valid if:
- Points out a **real bug** (wrong types, unreachable code, null safety)
- Identifies a **pattern violation** from your constitutions (e.g., using deprecated libs, wrong file placement)
- Catches a **type mismatch** or contract mismatch between components
- Points out **duplicate DOM IDs** or accessibility issues (UI)
- Identifies **security issues** that are genuinely exploitable in your deployment model

#### "Should Clarify with Reply" — Comment should be pushed back if:
- Suggests adding **extra flags/guards** for code paths that only run in local dev (over-engineering)
- Asks for changes that contradict your team's **established patterns**
- Suggests **scope creep** beyond the story (e.g., "also handle X")
- Misunderstands the **deployment model**
- Proposes **abstractions** for one-time, narrow-scope code paths

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
3. If your codebase has a known pattern of duplicated trees/copies that must be kept in sync (an "earned rule" — see CONTRIBUTING.md for the convention), apply the fix everywhere it's duplicated
4. Verify no type-check/lint errors after fixing

### 6. Draft Replies

For each "Should Clarify with Reply" item, draft a concise reply that:
- Acknowledges the concern
- References the specific pattern/decision that justifies the current approach
- Offers a minimal compromise if appropriate (e.g., "added a log warning" instead of "added 3 more guard flags")

## Reply Templates

<!-- TEMPLATE: these are illustrative examples of the kind of reusable reply you can keep on file
     for recurring review comments. Replace with your own team's recurring patterns. -->

### Scope Creep
> Valid observation, but this is outside the scope of TICKET-XXXX. Filed as tech debt / follow-up. Current implementation handles the happy path which covers our acceptance criteria.

### Over-Engineering for Narrow-Scope Code
> This code only runs in a narrow, well-understood context (e.g. local development) and is guarded by environment checks. Adding [suggested change] would add complexity without production benefit.

## Common Fix Patterns

<!-- TEMPLATE: this section is where your team documents recurring, specific gotchas
     (framework quirks, type-migration foot-guns, etc.) so the agent applies the same fix
     consistently every time instead of re-deriving it. Example shape below — replace with
     your own. -->

### Example earned rule
> `<a specific, checkable gotcha your team has hit more than once — worded as a rule an agent can verify mechanically. See CONTRIBUTING.md for how to add one.>`

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, or PII in reply drafts or fix descriptions. Replace with `[REDACTED]`
- **Reference, don't repeat** — cite constitution rules by section name/path rather than quoting them verbatim in replies
- **Keep replies concise** — reply drafts should be 2-4 sentences max; link to docs for full justification
- **Minimal fixes only** — do not refactor unrelated code while fixing review comments
- **Respect existing patterns** — if a comment contradicts an established codebase convention, push back with a reference to the governing rule
