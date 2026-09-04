---
name: handoff
description: "Compact the current conversation into a handoff document for another agent to pick up."
argument-hint: "What will the next session be used for?"
---

# Handoff — Session Continuity Skill

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS — not the current workspace.

## When to Use
- End of a long session that will continue later
- Switching context to a different agent or tool
- User says "handoff", "save context", "wrap up for next session"

## Procedure

### 1. Determine Output Path
Save the handoff document to the OS temporary directory:
- **macOS**: `/tmp/handoff-<timestamp>.md`
- **Linux**: `/tmp/handoff-<timestamp>.md`
- **Windows**: `%TEMP%\handoff-<timestamp>.md`

Use format: `handoff-YYYYMMDD-HHmmss.md`

### 2. Gather Context
Collect from the current conversation:
- **Goal**: What was the user trying to accomplish?
- **Decisions made**: Key choices and their rationale
- **Work completed**: Files created/modified, commands run, tests passed
- **Work remaining**: Unfinished tasks, known blockers, next steps
- **Current state**: Branch name, dirty files, failing tests, open questions

### 3. Tailor to Next Session
If the user passed arguments describing what the next session will focus on:
- Prioritize context relevant to that focus area
- Front-load the most important decisions and state for that work
- Trim unrelated tangents

### 4. Write the Handoff Document

Structure:

```markdown
# Handoff — <brief title>

**Created**: <timestamp>
**Previous session focus**: <1-line summary>
**Next session focus**: <from user args, or "Continue current work">

## Context Summary
<2-5 sentences describing the state of work>

## Decisions Made
| # | Decision | Rationale |
|---|----------|-----------|
| 1 | ... | ... |

## Work Completed
- <file or action> — <what was done>
- ...

## Artifacts (do not duplicate — reference only)
- Plan: `plans/<path>`
- PR: <URL or branch name>
- Spec: `specs/<path>`
- Commits: <short SHAs or branch ref>

## Current State
- **Branch**: <name>
- **Dirty files**: <list or "clean">
- **Tests**: <passing/failing/not run>
- **Blockers**: <list or "none">

## Work Remaining
1. <next task>
2. ...

## Open Questions
- <unresolved question>
- ...

## Suggested Skills
The next agent should consider invoking:
- `<skill-name>` — <why>
- ...

## Key Files
- `<path>` — <relevance>
- ...
```

### 5. Rules
- **Do NOT duplicate content** already captured in PRDs, plans, ADRs, issues, commits, or diffs — reference them by path or URL instead
- **Redact sensitive information** — API keys, passwords, tokens, PII must be stripped or replaced with `[REDACTED]`
- **Keep it compact** — target 50-150 lines; a fresh agent should parse this in seconds
- **Include suggested skills** — recommend which skills the next agent should invoke based on remaining work
- **Reference, don't repeat** — if a plan file exists, point to it rather than restating its contents
