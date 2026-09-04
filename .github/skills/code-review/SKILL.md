---
name: code-review
description: "Post-edit inferential sensor. Review changed files for bugs, regressions, constitution violations, and missing tests before finalizing."
argument-hint: "Changed files, ticket context, or branch diff"
---

<!--
GENERICIZED TEMPLATE — fill in:
  - "Constitution reference" paths for your own repo layout.
  - The release-branch naming pattern in step 1 (this used one company's `release/EDP_*` scheme).
-->

# Code Review Sensor

Run a focused self-review on current changes before completion.

## When to Use
- After implementing code changes
- Before posting a final response or opening a PR
- When changes span multiple repos or layers (UI, service, infra, etc.)

> **`@verify` vs `code-review`:** Use `@verify` first when a story is claimed complete — it runs acceptance criteria sensors and returns PASS/FAIL per criterion. `code-review` runs second, after `@verify` passes, to check constitution compliance and code quality. If you just want a quality check mid-implementation (not a full story close), use `code-review` directly.

## Procedure

### 1. Identify Review Scope

**Auto-discover changed files** (preferred — ask user to confirm target branch):

1. Run `git branch -r --sort=-committerdate | grep 'release/' | head -3` to find recent release branches
   <!-- adjust the grep pattern to match your own release-branch naming convention -->
2. Ask the user to confirm the comparison target:
   - `main` (default)
   - One of the last 3 release branches
   - A custom branch name
3. Run `git diff --name-only <target>...HEAD` to collect changed files

**Fallback options** (if auto-discover is skipped):
- `git diff --name-only HEAD` (uncommitted changes only)
- Explicit changed file list from user
- Ticket/plan file in `plans/`

### 2. Load Rules + Review (delegate when > 3 files changed)

**If 3 or fewer files changed:** Read the matching constitution inline and review directly.

**If more than 3 files changed:** Delegate to the `Explore` subagent:
> "Review these changed files: [file list]. Check each against the relevant constitution rules for its area. Return: a findings list (severity, file:line, issue) and any missing tests. No raw file contents."

Constitution reference (for direct reads or to pass as context to Explore) — fill in your own layer/domain constitutions, e.g.:
- `specs/<service>/ui-constitution.md`
- `specs/<service>/service-constitution.md`
- `specs/<lambda-or-worker-layer>/constitution.md`
- `specs/<iac-layer>/constitution.md`

### 3. Run Computational Sensors
Run smallest relevant checks first:
- Python changes: targeted `pytest` (or package-level tests)
- UI changes: targeted `npm test` (or typecheck/lint available in repo)
- Terraform changes: `terraform fmt -check -recursive` + `terraform validate`

If checks are unavailable, record that gap.

### 4. Inferential Review Pass

**Severity Classification:**
- **🛑 Blocker** — Breaks build, security flaw, data loss risk, constitution violation. Must fix before merge.
- **⚠️ Warning** — Code smell, missing test for new branch, unclear naming. Should fix.
- **💡 Info** — Style nit, potential improvement. Fix if convenient.

Review changed code for:
- Functional bugs and regressions
- Contract mismatches (DTOs, API payloads, state-machine shape)
- Constitution violations (placement, patterns, dependencies)
- Missing or weak tests for behavior changes
- Logging/security issues (no secrets, structured logs)

### 5. Output Format
Return findings first, ordered by severity:

```markdown
## Findings
1. [🛑] file/path:line - issue and impact (ref: <constitution>#<section>)
2. [⚠️] file/path:line - issue (ref: service-constitution §3.2)
3. [💡] file/path:line - suggestion

## Open Questions
1. ...

## Verification
- Command/check and result
- Target branch: <branch name>
- Files reviewed: <count>
```

If no issues are found, state: `No findings.` and list residual risks or test gaps.

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, connection strings, or PII in findings output. Replace with `[REDACTED]`
- **Reference, don't repeat** — point to spec/constitution sections by path rather than quoting them in full
- **Keep findings compact** — one line per issue; expand only when the fix is non-obvious
- **No false positives** — only flag issues you are confident about; mark uncertain items as "Open Questions"
- **Respect existing patterns** — do not flag code that follows an established codebase convention, even if generic best practices differ
