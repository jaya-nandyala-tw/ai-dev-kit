---
applyTo: "**"
description: "Story mode — Human review gate enforcement. Requires explicit approval before committing changes. Use when in story (@story) mode."
---

# Story Mode — Human Review Gate

## Critical Workflow Rule

**Before ANY git commit in story mode, you MUST present changes for human review and receive explicit approval.**

There is no technical mechanism forcing this — no hook actually intercepts `git commit` (see `.github/hooks/STORY_MODE_REVIEW_GATE.md` for why). The only real backstop is your editor/agent runtime's own terminal-command confirmation prompt, which is defeated if `git commit`/`git push` are on an auto-approve list. This rule is the entire gate: skipping the approval surface below means the commit simply happens.

### Review Gate Checklist

Before requesting approval, verify:

1. **Planned Alignment** — Changes match the tasks from `plans/active/TICKET-XXXX-*.md`
2. **Code Quality** — All tests pass (or tests are intentionally updated)
3. **Commit Message** — Follows your team's convention (e.g. `READY - TICKET-XXXX - {description}` or `TICKET-XXXX | {description}`)
4. **Staging** — Run `git status` to confirm only intended files are staged
5. **No Secrets** — No credentials, tokens, or API keys in staged files

### Approval Surface

Before committing, present the review to the user in this format:

```
📋 Review Gate — Story Mode Commit
Plan: [path to plan file]
Branch: [current branch]

### Changes Summary
{List of changed files and their purpose}

### Commit Message
{Full commit message}

### Verification
- [ ] Changes align with task: {task N description}
- [ ] Tests pass: {test command and result}
- [ ] No unintended files: {git status output}

Reply with:
  approve       — proceed with commit
  cancel        — abort commit
  show {file}   — review file contents
  modify        — request changes before commit
```

### After Approval

Only after explicit `approve` reply:
1. Stage changes: `git add -A`
2. Commit: `git commit -m "{message}"`
3. Update plan `## Status` → `Completed commits: N of M`
4. Update session checkpoint with latest commit hash
5. Report: "Commit {hash}: {message}"

### Edge Case: Test Failures

If tests fail but the failure is intentional (e.g., updating test fixtures), present the test output for review:

```
⚠️ Test Results — Intentional Update
Test: {test name}
Result: {failure summary}

This is expected because: {explanation}

Approval needed for: {what changed and why}

Reply: approve to commit despite test failure
```

---

## Scope

This gate applies only when:
- You are in `@story` mode (story agent)
- Changes are being staged via `git add` or `git commit`
- The user has not replied with an explicit `approve` to a prior review gate

This does NOT apply to:
- Reading or displaying code
- Running tests or linting
- Exploring branches or commit history
- Non-commit terminal commands
