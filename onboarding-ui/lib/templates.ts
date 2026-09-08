// Bundled baseline copies of every file this wizard manages. These are literal copies of the
// content this kit ships with — kept here (not read via `git show HEAD:<path>`) so the tool
// still works from a shallow clone, a tarball export, or a repo that's been vendored without
// its git history. Compared against real on-disk content to detect "someone already hand-edited
// this" before ever proposing a write. See lib/diff.ts.

export const CODEOWNERS_BASELINE = `# CODEOWNERS TEMPLATE — fill in with your team's real GitHub handles/groups before relying on this.
# Rules are evaluated in order; the last matching rule wins.
#
# Example:
# *                        @your-org/platform-maintainers
# /.github/agents/         @your-org/platform-maintainers
# /.github/instructions/   @your-org/platform-maintainers
# /scripts/                @your-org/platform-maintainers
`;

export const PRE_COMMIT_CONFIG_BASELINE = `# Pre-commit hooks — safety net for both agents and humans.
# Install: pip install pre-commit && pre-commit install
# Run all: pre-commit run --all-files
# Skip (emergency): git commit --no-verify
#
# GENERICIZED TEMPLATE — the \`files:\` globs below are placeholders pointing at
# \`codebase/<service>/...\` paths. Once you've cloned your own repos into
# \`codebase/\`, replace every \`<service>\`, \`<lambdas-or-workers>\`, and
# \`<iac-repo-prefix>\` placeholder with your own actual directory names so
# these hooks actually match files. The four hook groups themselves (Python
# lint, TS typecheck, Terraform fmt/validate, general hygiene) are a
# reasonable generic starting set — add/remove hooks to match your stack.

repos:
  # ── Python linting (service + workers) ──────────────
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.6
    hooks:
      - id: ruff
        args: [--fix]
        files: ^codebase/(<service>/service|<lambdas-or-workers>)/
      - id: ruff-format
        files: ^codebase/(<service>/service|<lambdas-or-workers>)/

  # ── TypeScript typecheck ────────────────────────────
  - repo: local
    hooks:
      - id: tsc-check
        name: TypeScript typecheck
        entry: bash -c 'cd codebase/<service>/ui && npx tsc --noEmit'
        language: system
        files: ^codebase/<service>/ui/src/.*\\.(ts|tsx)$
        pass_filenames: false

  # ── Terraform ───────────────────────────────────────
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.96.3
    hooks:
      - id: terraform_fmt
        files: ^codebase/<iac-repo-prefix>
      - id: terraform_validate
        files: ^codebase/<iac-repo-prefix>

  # ── General hygiene ─────────────────────────────────
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: detect-private-key
      - id: no-commit-to-branch
        args: [--branch, main, --branch, master]
`;

// Only the anchored block matters for diffing/regeneration; the rest of global.instructions.md
// is prose the wizard never touches. Kept here in full so `customized` detection still works if
// someone edited prose above/below the anchors.
export const GLOBAL_INSTRUCTIONS_BASELINE = `---
applyTo: "**"
description: "Global rules applied to every file in the workspace. Covers agent routing, memory hygiene, and completion sensors."
---

# Global Rules

<!--
  STARTER KIT TEMPLATE — this file ships with illustrative placeholders, not your repo's real
  structure. Before relying on it, fill in:
  - The memory index files under \`/memories/repo/\` that actually exist for your project.
  - The \`codebase/<service>/\` placement rules for your own services/apps.
  - The Sensor Dispatch Table with your own file globs and real test/lint commands.
  Everything below is the *pattern*, not the content — adapt it, don't just rename paths.
-->

## Memory Check (always first)
Before writing code or specs, check \`/memories/repo/\` for pre-indexed facts. Example index files —
replace with whatever your team actually maintains:
- \`/memories/repo/routes.md\` — UI routes and screen map
- \`/memories/repo/api-index.md\` — all API endpoints
- \`/memories/repo/data-models.md\` — DB tables and shapes
- \`/memories/repo/toggles.md\` — feature toggle registry (if your project uses feature flags)

Only read full spec files when the index lacks the required detail.

## Placement Rules

<!-- Replace this list with your own repo's real placement conventions. -->
- Frontend code → \`codebase/<service>/ui/src/...\` (state your team's actual convention here)
- Backend endpoints → your team's layout convention (e.g. router / service / DAO / DTO)
- Any read-only reference/POC directories → call them out explicitly and never edit them

## After Any Edit
Run the smallest relevant sensor before finalizing. Examples — replace with your stack's real commands:
- Python changes → \`pytest -xvs\` on the affected test file
- TypeScript/React changes → \`npm test -- --watchAll=false --testPathPattern=<file>\`
- Terraform changes → \`terraform validate\`

## Sensor Dispatch Table

Use a table like this to select the right sensor(s) based on which files changed. Fill in the \`File
Pattern\` and \`Cwd\` columns with your own services' real paths — the rows below are placeholders
illustrating the shape of the table, not literal paths to copy. The anchors below let tooling
(e.g. \`onboarding-ui/\`) regenerate just this table without touching the rest of this file.

<!-- sensor-dispatch-table:start -->
| File Pattern | Sensor Command | Cwd |
|---|---|---|
| \`codebase/<service>/src/**/*.py\` | \`ruff check {file} && pytest -xvs tests/\` | \`codebase/<service>/\` |
| \`codebase/<service>/tests/**/*.py\` | \`pytest -xvs {file}\` | \`codebase/<service>/\` |
| \`codebase/<service>/ui/src/**/*.{ts,tsx}\` | \`npx tsc --noEmit && npm test -- --watchAll=false --testPathPattern={stem}\` | \`codebase/<service>/ui/\` |
| \`codebase/<iac-module>/**/*.tf\` | \`terraform fmt -check -recursive && terraform validate\` | \`codebase/<iac-module>/\` |
| \`codebase/<function>/src/**/*.py\` | \`cd {function_root} && tox -e unit\` | \`codebase/<function>/\` |
| \`codebase/<shared-layer>/**\` | Run the test suite in ALL dependent services (check your dependency-map doc) | — |
<!-- sensor-dispatch-table:end -->

When multiple patterns match (e.g. service src + tests changed), run **all** matching sensors.

## Epic Drift Check

See the \`epic-drift-check\` skill for the full procedure. Invoked **unconditionally** — not left to be
"noticed" — by \`@story\`/\`@intake\`/\`@implement\` any time a plan's \`## Decisions\` table changes and that
plan has a non-empty \`Epic:\` field. The skill reads the structured child-story index at
\`plans/epics/{EPIC-KEY}.md\`, not a free-text grep.

## Checkpoint / Plan Self-Consistency

Whenever any agent writes or updates a session checkpoint (\`/memories/session/story-{TICKET-XXXX}.md\`),
diff the checkpoint's \`Phase\`/\`Workflow stage\` line against the plan file's own \`## Status\` → \`Phase\`
value **before** finishing the write. If they disagree, flag the mismatch immediately and resolve it
in the same turn — do not persist a checkpoint that contradicts its plan file.

> **Origin:** found live in a real project (original ticket \`PROJ-1234\`) — the checkpoint read "9/10
> complete" in one place, "6/10 commits" nearby, and "IN PROGRESS — Task 1/10" further down, while the
> plan file itself had already moved on. Caught at write time here instead of at the next audit. Keep
> this callout style when you accumulate your own war stories — a concrete "here's the bug this
> prevents" is more durable than an abstract rule.
`;

export const REPOS_JSON_BASELINE = `{
  "_comment": "GENERICIZED TEMPLATE — single source of truth for scripts/clone-repos.sh and scripts/pull-all.sh. Edit this file by hand, or run ./scripts/clone-repos.sh --select to populate it via the GitHub CLI. See ONBOARDING.md § Adding Other Repos to This Harness.",
  "github": {
    "org": "<your-github-org>",
    "protocol": "ssh"
  },
  "repos": [
    { "name": "<service-name>", "tier": "core" },
    { "name": "<another-service-name>", "tier": "core" },
    { "name": "<worker-repo-1>", "tier": "worker" },
    { "name": "<worker-repo-2>", "tier": "worker" }
  ]
}
`;

// This kit deliberately ships no .env.template (README: "this kit doesn't ship product env
// vars") — the "env" managed file falls back to this in-memory baseline when .env doesn't exist
// yet on disk, so DEV_EMAIL/JIRA_* have somewhere sane to write to on first use.
export const ENV_BASELINE = `# ── Personal settings ──
DEV_EMAIL=
`;

export const FETCH_MY_STORIES_BASELINE_BOARD_LINE = 'BOARD_ID = 0  # fill in your board ID';
export const FETCH_MY_STORIES_BASELINE_PROJECT_LINE = 'PROJECT = "PROJ"  # fill in your Jira project key';
export const FETCH_SPRINT_STORIES_BASELINE_BOARD_LINE = 'BOARD_ID = 0  # fill in your board ID';
