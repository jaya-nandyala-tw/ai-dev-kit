# Story Mode Review Gate — Implementation Guide

## Overview

The story mode enforces a **human review gate before any git commit**. This prevents accidental commits of incomplete or misaligned changes.

## How It Works

### Phase 1: Change Preparation
When making changes in story mode, the agent:
1. Reads the plan file to understand the current task
2. Makes code changes as planned
3. Runs any necessary tests or validation

### Phase 2: Review Gate
**Before committing**, the agent MUST:
1. Display the proposed changes to the user
2. Show the commit message
3. List affected files
4. Wait for explicit approval or instructions

**User can:**
- `approve` — Proceed with commit
- `cancel` — Abort commit and return to implementation
- `show {filename}` — Review specific file
- `modify` — Request changes before committing

### Phase 3: Commit + Update
Only after `approve` reply:
1. Stage and commit changes
2. Update plan file with commit status
3. Update session checkpoint
4. Report completion

## Configuration

**There is no technical hook that blocks `git commit` in most AI coding assistants' chat/agent modes.** `.github/hooks/story-mode-review-gate.json` documents the intended trigger/condition/message shape, but not every agent runtime has a mechanism that loads a repo-defined JSON file from `.github/hooks/` and intercepts a tool call against it. **Check whether your specific agent runtime supports this before assuming it's enforced** — if it does support a `PreToolUse`-style hook (Claude Code does, via `settings.json`; some other tools don't), wire this JSON's intent into that mechanism. Otherwise, treat it as a spec for a hook, not a working hook.

**What actually enforces this gate, in order of strength:**
1. **Your editor/agent runtime's native per-command confirmation** — most agent modes ask you to approve every terminal command (including `git commit`) before it runs, unless you've added it to an auto-approve/allow-list. This is the strongest real technical backstop where it exists. **Do not add `git commit` or `git push` to any auto-approve list** — doing so silently removes this gate entirely if nothing else in your setup can stop the command.
2. **The instructions file** (`.github/instructions/story-mode-review-gate.instructions.md`, loaded on every turn via `applyTo: "**"`) — tells the model it must present the approval surface and wait for `approve` before committing. This is self-policing: it works because the model follows it, not because anything blocks it from doing otherwise.

### Instruction Configuration
File: `.github/instructions/story-mode-review-gate.instructions.md`
- Applies to: Story mode work (when `@story` agent is active) — enforced by prose scope only (see file), not a technical filter
- Enforces: Review gate workflow and approval surface format
- Covers: Edge cases (test failures, staging issues)

## Example Workflow

```
📋 Review Gate — Story Mode Commit
Plan: plans/active/TICKET-1234-example-feature.md
Branch: feature/TICKET-1234-example-feature

### Changes Summary
- Modified: src/utils/constants.py (registry ID updates)
- Modified: tests/test_registry.py (registry ID fixtures)

### Commit Message
TICKET-1234 | Update search endpoint to new registry IDs

### Verification
- [x] Changes align with task 4: Update search endpoint to new registry IDs
- [x] Tests pass: 24/24 registry tests pass ✅
- [x] No unintended files: 2 files staged (both intended)

Reply with:
  approve       — proceed with commit
  cancel        — abort commit
  show {file}   — review file contents
  modify        — request changes before commit
```

**User replies:** `approve`

**Agent response:**
```
✅ Commit approved. Proceeding...
[feature/TICKET-1234-example-feature abc1234] TICKET-1234 | Update search endpoint to new registry IDs
 2 files changed, 12 insertions(+), 5 deletions(-)

📝 Plan updated: Task 4 marked complete
🔗 Session checkpoint: Updated with commit abc1234
```

## Benefits

✅ **Prevents mistakes** — Catches unintended files or wrong commit messages
✅ **Ensures alignment** — Changes match planned tasks
✅ **Documents intent** — User explicitly approves changes with context
✅ **Audit trail** — Session checkpoint records approval
✅ **Flexible** — User can review, cancel, or request modifications

## When This Applies

**Story mode commits are gated:**
- Story implementation (Phase 6)
- Task completion and progress updates
- Any `git commit` command during story work

**NOT gated:**
- Reading code or exploring branches
- Running tests or linting (without committing)
- Non-story mode work

## FAQ

**Q: Can I skip the review gate?**
A: No. The gate is enforced for story mode to prevent drift between code and plan.

**Q: What if I need to make a quick fix?**
A: Present it for review. The gate is fast — just confirm the change aligns with the current task.

**Q: What if a test fails?**
A: The gate presents test output. You can approve if the failure is intentional (e.g., updating fixtures), or request changes.

**Q: Can I cancel and redo?**
A: Yes. Reply `cancel` to abort the commit and make corrections.

## Related Files

- Story mode instructions: `modeInstructions` in system prompt (or your runtime's equivalent)
- Implementation plan: `plans/active/TICKET-XXXX-*.md`
- Session checkpoint: `memories/session/story-{TICKET-XXXX}.md`
