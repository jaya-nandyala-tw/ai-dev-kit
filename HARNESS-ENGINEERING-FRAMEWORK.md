# Harness Engineering Framework v1.0

Repo: `<this-repo-url>` — fill in your own fork/clone's URL once you've adopted this kit.

## What this is

A shared starter kit that gives every workstream repo the same AI coding agent setup — named
agents, on-demand skills, a commit/PR review gate, and local dev tooling — instead of each team
reinventing it. **Agent = Model + Harness**: the model provides intelligence, the harness (prompts,
tools, feedback loops, guardrails) is what makes it reliable in *your* codebase instead of producing
generic output.

## Why it exists

- Cuts review toil — agents catch their own mistakes before code reaches a human reviewer.
- One convention across repos — engineers switching workstreams don't relearn a new agent setup.
- Portal-agnostic — the pattern (scoped instructions, on-demand skills, a soft commit gate) ports to
  any agent runtime, not just one vendor's tool.

## How it works, briefly

- **Guides** steer the agent before it acts (scoped instructions, specs it loads on demand).
- **Sensors** catch mistakes after it acts (lint, tests, an independent review step) and hand the
  agent a concrete error to self-correct on, instead of a human catching it in review.
- Rules are earned from real past failures, not auto-generated — and repeated prose rules get
  promoted into linters/tests over time so enforcement becomes mechanical, not just advisory.

## Agentic workflow pipeline

> Diagram of how a ticket moves through the agents (groom → plan → human gate →
> implement/test/commit loop → verify → review → close).

## Getting started

1. Clone the starter kit repo (`<this-repo-url>`) as the base for your new workstream repo.
2. Open it in an agent-capable editor and ask it what agents/skills it defines — no setup required
   to try this.
3. Follow the repo's onboarding guide for one-time environment setup.
4. Fill in the placeholder files (marked `TEMPLATE`) with your own repo names, test commands, and
   board config.
5. Run your first ticket through the story workflow: groom → plan → implement → test/verify →
   commit → doc update.

## Where to go next (inside the repo)

- **Full methodology** — principles, failure modes, a worked example.
- **README** — full feature list and adoption checklist.
- **Onboarding guide** — tooling prerequisites and daily workflow for a new teammate.
- **Story implementation guide** — how a ticket flows through the agents step by step.
- **Contributing guide** — how to propose changes to the shared harness itself.
