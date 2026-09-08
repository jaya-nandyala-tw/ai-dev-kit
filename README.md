# AI Starter Kit

> **9 agents · 9 skills · 11 plugins · 3 prompts · 1 commit/PR review gate** — portal-agnostic, adopt into your own repo.

A shared, portal-agnostic agentic-engineering harness and dev-tooling starter kit. Clone or fork this
repo to bootstrap a new workstream repo with the same AI coding agent conventions, guardrails, and
local dev tooling used across your other repos — without inheriting any one product's specific paths,
repo names, or business logic.

This kit was extracted from an existing production repo by generalizing everything that was reusable
and dropping everything that was specific to that product. Wherever a piece of content needed a real
path, repo name, or ticket format to be useful, it ships here as a clearly marked placeholder for you
to fill in.

## Quick Start

**Just want to see it work (30 seconds)** — no customization, no placeholders filled in yet:

```bash
git clone <this-repo-url> my-new-repo && cd my-new-repo
pip install pre-commit && pre-commit install
```

Open the repo in an editor with an agent runtime that reads `.github/` (Claude Code, GitHub Copilot,
etc.) and try:

```
@ask "What agents and skills does this harness define?"
```

**Actually adopting this into a new workstream repo (~30 minutes)** — fill in the placeholders, wire
up your own repos/services, and read the real workflow end to end: see
[Getting Started / How to Adopt](#getting-started--how-to-adopt) below, then `ONBOARDING.md`.

**Prefer a guided UI over hand-editing files?** Run the onboarding dashboard instead of doing the
steps below by hand:

```bash
cd onboarding-ui && npm install && npm run dev
```

It's a local-only Next.js app that reads/writes the placeholder files for you with a diff preview
before every write, runs the real setup scripts with live streamed output, asks a few questions
about your stack to skip whatever doesn't apply to you, and flags which agents/skills/plugins/
scripts aren't relevant to your team so you can remove them. See `onboarding-ui/README.md`.

## Guardrails

This isn't just prompts — it ships one real safety mechanism, borrowed from the same idea as tool
guardrails in other agent harnesses:

- **Commit/PR review gate** (`.github/hooks/story-mode-review-gate.json` +
  `.github/instructions/story-mode-review-gate.instructions.md`) — `@git` must stop and show you the
  diff/PR before `git commit`, `git push`, or `terraform apply`. It is a **soft gate**: most agent
  runtimes have no technical way to block a tool call, so the real enforcement is your editor's native
  per-command terminal confirmation. **Never add those commands to an auto-approve allowlist** — doing
  so silently defeats the only backstop this harness has. Full explanation:
  `.github/hooks/STORY_MODE_REVIEW_GATE.md` § Real interception vs. soft gates.
- **Read-only reference directories** — the placement-rules pattern in
  `.github/instructions/global.instructions.md` lets you mark a directory (a POC, a cloned dependency
  repo, generated code) as never-edit; agents are instructed to read it for context and never propose
  changes to it.

## Architecture at a Glance

```
.github/
├── agents/        9 named agents — the story lifecycle (intake → plan → implement → test → close)
├── skills/        9 on-demand multi-step procedures agents invoke
├── plugins/       11 of those skills packaged as installable, distributable bundles
├── prompts/       3 one-shot "/" templates (blast-radius, change-spec, trace-flow)
├── hooks/         the commit/PR review gate spec — see Guardrails above
└── instructions/  always-on + path-scoped rules agents load automatically
scripts/           AWS/Okta auth, multi-repo clone/pull, workspace toggling, local debug helpers
config/            repos.json — single source of truth for which repos this harness manages
onboarding-ui/     local-only guided setup dashboard — the click-through alternative to this checklist
jira_client/       reusable Jira Cloud API client + NL CLI agent
memories/          convention for durable repo indexes + ephemeral per-story checkpoints
profiles/          example local-dev environment profiles
```

**Adapting to a non-Claude-Code runtime:** the exact file formats here (`*.agent.md` frontmatter,
`plugin.json` manifests) are Claude-Code-shaped. If your workstream standardizes on a different agent
runtime (GitHub Copilot custom instructions, Cursor `.cursor/rules`, etc.), the *pattern* — markdown
instructions scoped by path (`applyTo`), a small set of named multi-step workflows, a soft commit/PR
review gate — is what's worth porting, not the literal file layout. Treat everything under `.github/`
as a reference implementation of that pattern, not a required format.

## What's Included

| Path | Purpose |
|---|---|
| `.github/agents/` | Named AI agents (`@ask`, `@story`, `@groom`, `@implement`, `@git`, `@test`, `@verify`, `@doc-garden`, `@orchestrator`) that define the story lifecycle: intake → plan → approve → implement → test → review → close. |
| `.github/skills/` | Reusable multi-step procedures agents invoke on demand (`plan-story`, `pr-manager`, `code-review`, `address-pr-comments`, `grill-me`, `handoff`, `doc-garden`, `epic-drift-check`, `generate-test-suite`). |
| `.github/plugins/` | Self-contained bundles (manifest + skill) for the same kind of on-demand workflow, packaged for distribution as installable plugins. |
| `.github/prompts/` | Reusable one-shot prompt templates (`blast-radius`, `change-spec`, `trace-flow`) invoked with `/`. |
| `.github/hooks/` | The story-mode commit review gate — a spec for a pre-commit approval surface, plus an honest explanation of what actually enforces it in your agent runtime. |
| `.github/instructions/` | Always-on and path-scoped rules (`applyTo` patterns) agents load automatically: global conventions, IaC conventions, worker/lambda conventions, the review-gate rule. |
| `scripts/` | Generic dev-tooling: AWS/Okta auth, multi-repo clone/pull, VS Code workspace folder toggling, local lambda/worker debug and invoke helpers, a mock IdP + dev-login bypass for local auth, profile switching. |
| `config/repos.json` | Single source of truth for which repos this harness clones/pulls/shows in the workspace — edit by hand or populate via `./scripts/clone-repos.sh --select` (GitHub CLI-backed multi-select). |
| `onboarding-ui/` | Local-only Next.js dashboard that turns this README's adoption checklist and `ONBOARDING.md`'s setup steps into a click-through flow — diff preview before every write, live-streamed script execution, and a stack-aware "Recommended Resources" panel. `cd onboarding-ui && npm install && npm run dev`. |
| `jira_client/` | A reusable, env-var-configured Python client for the Jira Cloud REST/Agile APIs, with a natural-language CLI agent. |
| `memories/` | The convention (not the content) for durable per-repo indexes (`memories/repo/`) and ephemeral per-story checkpoints (`memories/session/`) that agents read/write. |
| `profiles/` | Example local-dev environment profiles (`fullstack`, `backend`, `frontend`, `lambda`, `integration`, `aws-login`) switched via `scripts/profile.sh`. |
| `harness-engineering.md` | The methodology behind this harness — principles, context-rot failure modes, and a worked example of applying them. |
| `STORY-IMPLEMENTATION-GUIDE.md` | How to actually run a story through the agent workflow, phase by phase. |
| `ONBOARDING.md` | New-teammate setup guide — tooling prerequisites, one-time setup, daily workflow. |

## What's Deliberately Not Included

Scaffolding skills that are inherently tied to one codebase's exact file layout (e.g. "add a new
endpoint," "add a new screen," "add a new feature toggle") were left out — write your own once your
own architecture stabilizes, using the included skills as a format reference. Anything referencing a
specific product's business logic, real repo names, or a specific company's infrastructure was
excluded outright rather than half-genericized.

## Getting Started / How to Adopt

1. **Clone or fork this repo** as the starting point for your new workstream repo.
2. **Fill in the placeholders.** Several files ship with template content marked by a `GENERICIZED
   TEMPLATE` or `TEMPLATE` comment at the top — search for that string to find all of them. At minimum:
   - `.github/instructions/global.instructions.md` — replace the placeholder Sensor Dispatch Table
     with your own services' real file globs and test/lint commands.
   - `.pre-commit-config.yaml` — replace the `<service>` / `<iac-repo-prefix>` placeholders in each
     hook's `files:` pattern with your own repo layout.
   - `.talismanrc` — run `talisman -i` once you have real files to ignore; don't hand-write checksums.
   - `CODEOWNERS` — fill in your team's real GitHub handles/groups.
   - `config/repos.json` — fill in your own GitHub org and repo list (by hand, or run
     `./scripts/clone-repos.sh --select --org <your-org>` to populate it via the GitHub CLI). This
     single file drives `clone-repos.sh`, `pull-all.sh`, and `workspace.py` — no need to edit those
     scripts directly.
   - `jira_client/fetch_my_stories.py` / `fetch_sprint_stories.py` — fill in your own board ID/project
     key, or delete them if you don't use Jira boards this way.
   - `.github/workflows/ci.yml` — replace the placeholder steps with your real lint/test commands.
3. **Set up your environment**: copy `.env.template` (create your own — this kit doesn't ship product
   env vars) to `.env`, then see `ONBOARDING.md` for the full one-time setup.
4. **Read `STORY-IMPLEMENTATION-GUIDE.md`** to understand how a story actually flows through
   `@groom` → `@story` → `@implement` → `@test`/`@verify`/`@git` → `@doc-garden`.
5. **Start writing your own `specs/`** — the agents and skills here assume a `specs/<domain>/...`
   tree exists (constitutions, API contracts, data models, feature inventory); none of that product
   content ships in this kit, since it's inherently yours to write.

## Contributing

See `CONTRIBUTING.md` for how to propose changes to the shared harness while keeping it portal-agnostic.
