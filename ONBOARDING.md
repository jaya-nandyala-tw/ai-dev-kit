# Team Onboarding Guide

> Get set up with this AI-assisted engineering harness in under 30 minutes.

<!-- GENERICIZED TEMPLATE — this walks a new teammate through cloning, tooling, and using the
     agents/skills/prompts in .github/. Sections marked with a comment need your own repo names,
     ports, and specs/ tree filled in. The "Key Architecture Rules" section is a placeholder for
     your own cheat sheet — the original this was extracted from had one specific to its stack. -->

---

> **Prefer a guided UI?** `cd onboarding-ui && npm install && npm run dev` runs a local dashboard
> that does the steps below for you — diff preview before every file write, live-streamed script
> output, and a "Recommended Resources" panel that flags what your stack doesn't need. See
> `onboarding-ui/README.md`. Everything below still applies if you'd rather do it by hand, or want
> to understand what the dashboard is actually doing.

---

## What Is This?

This repo is a **Context Engineering framework** that supercharges AI-assisted development across your team's repos. It gives AI coding agents structured knowledge about your architecture, coding patterns, and deployment workflows — so they produce correct, consistent code instead of hallucinating.

**Before:** an agent sees only the open file/repo → suggests wrong patterns, puts code in wrong directories, misses cross-repo impact.

**After:** the agent loads scoped context per file → follows your architecture patterns, respects placement rules, identifies blast radius automatically.

---

## Prerequisites

| Requirement | How to get it |
|---|---|
| An editor with an AI coding agent (VS Code + Copilot, Claude Code, etc.) | Fill in your team's tool of choice |
| Git + SSH key for GitHub | `ssh-keygen` → add to GitHub Settings → SSH Keys |
| Container runtime (Docker Desktop / Colima / Podman) | See [System Dependencies → Container Runtime](#container-runtime) |
| Node.js / Python / whatever your stack needs | Fill in your own versions |
| GitHub CLI (`gh`) — optional, only for `./scripts/clone-repos.sh --select` | `brew install gh` then `gh auth login` |

> This kit deliberately doesn't cover your team's local dev experience (cloud auth, environment
> profiles, IDE workspace setup) — bring your own tooling for that. It's scoped to the AI harness:
> agents, skills, guardrails, and the story lifecycle below.

---

## System Dependencies

Install these tools before running the setup steps. Fill in your own stack's actual version requirements.

### Node.js & npm (if you have a JS/TS frontend)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18
nvm alias default 18
```

### Python (if you have a Python backend/workers)

```bash
brew install python@3.12
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Container Runtime

Required to run a local database, mocks, and services, if your dev setup uses `docker-compose.yml` (not included in this starter kit — add your own).

**Option A — Docker Desktop** *(simplest, GUI included)*
```bash
# Download from https://www.docker.com/products/docker-desktop/
```

**Option B — Colima** *(lightweight, free, macOS/Linux)*
```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 8    # tune to your machine
```

**Option C — Podman Desktop**
```bash
brew install podman
podman machine init && podman machine start
```

Verify:
```bash
docker info
docker compose version   # should be v2.x
```

### Git

```bash
brew install git
git --version
git config --global user.name  "Your Name"
git config --global user.email "you@<your-company>.com"
```

### Terraform (if you work on IaC)

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform version
```

### pre-commit

```bash
pip3 install pre-commit
pre-commit --version
```

### Quick Version Check

```bash
node --version && python3 --version && docker --version && git --version
```

---

## Setup (One-Time)

### Step 1: Clone This Repo

```bash
git clone git@github.com:<your-github-org>/<this-repo-name>.git
cd <this-repo-name>
```

### Step 2: Configure Your Environment

```bash
cp .env.template .env
```

Edit `.env` and fill in your own identity settings (e.g. `DEV_EMAIL`) — everything else should have sensible defaults for local dev.

### Step 3: Install Pre-commit Hooks

```bash
pip install pre-commit
pre-commit install
```

This activates automatic lint/typecheck/security checks before every commit. Hooks run only on changed files — they're fast.

### Step 4: Clone Code Repos

First, tell the harness which repos exist. Everything — cloning and daily pulls — reads from **one
file**: `config/repos.json`. You never need to touch `scripts/clone-repos.sh` or
`scripts/pull-all.sh` themselves.

**Option A — populate it via GitHub CLI (recommended):**

```bash
./scripts/clone-repos.sh --select --org <your-github-org>
```

This uses [`gh`](https://cli.github.com/) (install it, then `gh auth login`, if you haven't) to list
every repo in your org, lets you multi-select the ones you want (comma-separated numbers, ranges
like `1,3,5-8`, or `all`), asks whether each is a core service or a worker/lambda repo, and writes
the result into `config/repos.json`. It then goes straight into cloning them.

You can also pull from a GitHub Project (v2) board instead of a whole org:
```bash
./scripts/clone-repos.sh --select --project 12 --owner <your-github-org>
```

**Option B — edit `config/repos.json` by hand.** It's plain JSON — no script required:

```json
{
  "github": { "org": "your-github-org", "protocol": "ssh" },
  "repos": [
    { "name": "billing-service", "tier": "core" },
    { "name": "notifications-worker", "tier": "worker" }
  ]
}
```

- `tier: "core"` → always cloned, into `codebase/<name>`.
- `tier: "worker"` → cloned into `codebase/workers/<name>` unless `--core-only` is passed.

Either way you end up with a filled-in `config/repos.json`. Then clone:

```bash
./scripts/clone-repos.sh              # interactive: core-only, or core + workers
./scripts/clone-repos.sh --all        # clone everything listed
./scripts/clone-repos.sh --core-only  # clone only tier:"core" repos
```

**Adding one more repo later:** re-run `./scripts/clone-repos.sh --select --org <org>` and pick just
the new one (it merges into the existing file, it doesn't replace it), or add one more object to the
`repos` array by hand, then run `./scripts/clone-repos.sh` again.

**Removing a repo:** delete its entry from `config/repos.json`. It won't be re-cloned or pulled; the
folder on disk is left alone (delete `codebase/<name>` yourself if you want it gone entirely).

**The two things `config/repos.json` drives, concretely:**

| Concern | Script | Behavior |
|---|---|---|
| What gets cloned | `clone-repos.sh` | Every `tier:"core"` repo, plus `tier:"worker"` repos unless `--core-only` |
| What gets kept up to date | `pull-all.sh` | Every repo listed, at its `codebase/<name>` or `codebase/workers/<name>` path |

### Step 5: Open the Workspace

This kit doesn't ship an `ai-workspace.code-workspace` file — write your own multi-root VS Code
workspace with a folder entry per repo in `config/repos.json` plus this repo's root (so
`.github/` is in a workspace root and its path-scoped instructions actually load). Then:

```bash
code ai-workspace.code-workspace
```

VS Code will prompt you to install recommended extensions — accept all.

### Step 6: Start Local Dev

This starter kit doesn't ship a `start.sh`/`stop.sh` — local runtime startup (database, mocks,
services) is too specific to any one stack to extract generically, and it's the kind of local dev
experience this kit deliberately leaves to your own tooling. Write your own.

### Step 7: Verify It Works

Fill in your own local URLs (UI, API docs, auth) once you have a start script.

> ⚠️ **Never add `git commit`, `git push`, or `terraform apply` to an agent auto-approve
> allowlist.** Story mode's commit/PR review gate (`story-mode-review-gate.instructions.md`) has no
> technical enforcement in most agent runtimes — your editor's native per-command terminal
> confirmation is the only real backstop this harness has. Auto-approving those commands silently
> defeats it: the model will commit/push/apply without the review step ever being shown. See
> `.github/hooks/STORY_MODE_REVIEW_GATE.md` § Real interception vs. soft gates.

---

## How the AI Context Works

When you open a file, your agent automatically loads **scoped instructions** based on the file path, via `applyTo` patterns in `.github/instructions/`. Fill in your own table once you've written your `.instructions.md` files, e.g.:

| You're editing... | Loads... |
|---|---|
| `codebase/<service>/ui/**` | Frontend rules |
| `codebase/<service>/service/**` | Backend rules |
| `codebase/workers/**` | Worker/lambda ecosystem rules |
| `codebase/<iac-repo>/**` | Terraform/IaC rules |

**You don't need to do anything** — context loads automatically once you've defined these files.

---

## Using AI Agents

Invoke agents in your agent's chat with `@agent-name`. For the full story delivery workflow, see [STORY-IMPLEMENTATION-GUIDE.md](./STORY-IMPLEMENTATION-GUIDE.md).

| Agent | What it does | Example |
|---|---|---|
| `@ask` | Answer codebase questions | *"How does approval work end to end?"* |
| `@story` | Runs the full story lifecycle as a loop controller — intake through close | *"Plan TICKET-1234: add cost center validation to workspace creation"* |
| `@intake` | Intake, ticket fetch, request classification, and interrogation — invoked automatically by `@story` at the start of a new story, not usually typed directly | *(you'll see `@intake` run before a plan exists — that's expected, not a separate step you trigger yourself)* |
| `@implement` | Makes the edit for exactly one approved task — invoked by `@story`'s implementation loop, one call per task. Refuses to run if the plan isn't approved yet | *(also not typed directly — `@story` calls it per task automatically)* |
| `@git` | Manage branches and PRs | *"Create feature branches for TICKET-1234 across services and IaC"* |
| `@test` | Generate tests | *"Write tests for the new approval endpoint"* |
| `@verify` | Validate story completion | *"Verify TICKET-1234 is done against acceptance criteria"* |
| `@orchestrator` | Route multi-domain tasks | *"Implement TICKET-1234 end-to-end across UI, service, and workers"* |
| `@doc-sync` | Keep specs in sync — also auto-triggered by `@story` at story close if any spec file was touched | *"Specs are drifting — update them for the changes I just shipped"* |

### Tips for Effective Agent Use

1. **Include the ticket ID** — agents use it for branch naming and commit prefixes
2. **Be specific about scope** — any stack-specific scope question (e.g. toggle scope) matters for file placement
3. **Let agents read specs** — they'll reference `specs/` files for accurate context
4. **Just start with `@story`** — it owns the whole lifecycle now and delegates internally
   (`@intake` at the start, `@implement` per task, `@test`/`@git`/`@verify`/`@doc-sync` as each
   phase needs them). You don't drive those sub-agents yourself in the normal flow, and two of
   them will refuse to run out of order on purpose: `@implement` won't touch code before the plan
   is approved, and `@git` won't push or open a PR before the story reaches close.

---

## Using Skills

Skills are reusable workflows for common tasks. Your agent invokes them automatically when relevant, or you can trigger them explicitly:

| Skill | Trigger phrase | What it does |
|---|---|---|
| `plan-story` | *"Plan story TICKET-XXXX"* | Per-repo implementation plan |
| `pr-manager` | *"Manage PRs for TICKET-XXXX"* | Cross-repo branch + PR coordination |
| `code-review` | *"Review my changes"* | Post-edit bug, regression, and constitution check |
| `address-pr-comments` | *"Address PR review comments"* | Fix or reply drafts for each review comment |
| `grill-me` | *"Grill me on this plan"* | Relentless design interview to stress-test decisions |
| `handoff` | *"Hand off this session"* | Compact context doc for the next agent |
| `doc-sync` | *"Update docs"* / *"Specs are drifting"* | Targeted spec updates to match codebase |
| `epic-drift-check` | (invoked automatically by agents) | Propagate a changed decision to sibling stories under the same epic |
| `generate-test-suite` | *"Generate a test suite for..."* | TSV test cases for your manual QA spreadsheet |

> Scaffolding skills (new endpoint, new screen, new feature toggle) are deliberately **not** included
> in this starter kit — they're inherently specific to one codebase's exact file layout. Write your
> own once your architecture is established; use the skills above as a template for the format.

---

## Using Prompt Templates

Prompt files (`.prompt.md`) are reusable queries in `.github/prompts/`:

| Prompt | Use case |
|---|---|
| `blast-radius` | *"What breaks if I change this shared module?"* |
| `change-spec` | Generate a structured change spec from a user story |
| `trace-flow` | Trace a feature's data flow across layers |

To use: open your agent's chat → type `/` → select the prompt template.

---

## Key Architecture Rules (Cheat Sheet)

<!-- This section is a placeholder. The repo this starter kit was extracted from had a dense,
     stack-specific cheat sheet here (frontend framework rules, backend layering, worker/lambda
     conventions, IaC conventions). Write your own once your architecture stabilizes — a good cheat
     sheet is short, opinionated, and links to the fuller constitution doc in specs/ for detail. -->

### Frontend
- Fill in your own placement rules, state-management conventions, and component library choice.

### Backend
- Fill in your own layering pattern (DDD, MVC, etc.) and ORM/validation library choices.

### Workers
- Fill in your own handler pattern and shared-library conventions.

### IaC
- Fill in your own artifact-referencing and apply conventions.

---

## Daily Workflow

```
1. Pull latest context    →  cd <this-repo-name> && git pull && ./scripts/pull-all.sh
2. Start local dev        →  (your own start script)
3. Open workspace         →  code ai-workspace.code-workspace
4. Start your story       →  @story "Plan TICKET-XXXX: <description>"
5. Code with AI           →  agent auto-loads context per file
6. Test                   →  @test "Write tests for <what you built>"
7. Branch & PR            →  @git "Create PRs for TICKET-XXXX"
8. Stop                   →  (your own stop script)
```

---

## Keeping Specs Fresh

Specs in `specs/` are the AI's source of truth. When you ship a feature, update the relevant spec — fill in your own table, e.g.:

| Change | Update |
|---|---|
| New API endpoint | `specs/<service>/api-contracts.md` |
| New worker | `specs/<worker-layer>/dependency-map.md` |
| Architecture decision | Relevant `constitution.md` |
| New feature shipped | `specs/product/feature-inventory.md` |
| New business workflow | `specs/product/business-workflows.md` |

> **Stale specs → stale AI output.** Treat spec updates as part of your definition of done.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `clone-repos.sh` fails | Check SSH key: `ssh -T git@github.com` |
| DB won't start | `docker compose down -v && docker compose up db -d` (fill in your own service name) |
| Agent gives wrong patterns | Ensure you opened the `.code-workspace` file (not individual folders) |
| Agent doesn't load context | Close and reopen the workspace file; ensure `.github/instructions/` exists |

---

## FAQ

**Q: Do I need every worker/lambda repo cloned?**
A: No. Use `./scripts/clone-repos.sh --core-only` to scope down. Clone only what you need.

**Q: Can I use my own VS Code settings?**
A: Yes. The workspace file only adds folder roots and recommended extensions. Your user settings are preserved.

**Q: Does this replace our existing git workflow?**
A: No. You still create branches, push, open PRs on GitHub. The `@git` agent helps automate the mechanics but doesn't change the process.

**Q: What if my agent ignores the instructions?**
A: Make sure you opened the multi-root workspace (not a single folder). Instructions only load when the `.github/` folder is in a workspace root. Restart your editor if needed.

**Q: How do I update this repo itself?**
A: `git pull`. Code repos inside `codebase/` are separate git repos — use `./scripts/pull-all.sh` to update them.

---

## Resources

| Resource | Location |
|---|---|
| This repo's README | `README.md` |
| Story implementation guide | `STORY-IMPLEMENTATION-GUIDE.md` |
| Harness strategy | `harness-engineering.md` |
| Domain model | `specs/product/domain-model.md` (fill in your own) |
| Business workflows | `specs/product/business-workflows.md` (fill in your own) |
| Feature inventory | `specs/product/feature-inventory.md` (fill in your own) |
