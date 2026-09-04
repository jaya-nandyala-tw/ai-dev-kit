---
applyTo: "codebase/<functions>/**"
description: "Serverless function ecosystem rules — shared layer, handler/process pattern, pytest+moto, tox. Use when writing or modifying function handlers, shared layer code, or workflow-orchestration integrations."
---

# Serverless Function Instructions

<!--
  STARTER KIT TEMPLATE — written for a Python/AWS Lambda ecosystem with a shared layer, since that's
  a common Org shape. If your stack differs (different cloud, different runtime, no shared layer),
  keep the *principles* section and rewrite the Key Rules for your actual tooling.
-->

You are working in a **serverless function ecosystem** — a collection of Python functions sharing a
common layer/library.

Before generating code, read:
- `specs/functions/constitution.md` — core principles, patterns, layer rules, DO NOT list
- `specs/functions/dependency-map.md` — which function depends on what
- `specs/functions/deploy-guide.md` — build, deploy, and pre-deploy checklist
- `specs/functions/workflow-contracts.md` — orchestration/dispatch patterns (e.g. Step Functions)

## Core Principles
- **Function-based**: No classes for workflow logic. Small, composable, stateless functions.
- **Tests are NON-NEGOTIABLE**: Every behavior change needs tests. Bug fixes need regression tests.
- **Structured observability**: Use structured logging with direct keyword args, not a dict-splat.
  Never log secrets/PII.
- **Minimal dependencies**: Justify new deps. Prefer stdlib and existing packages.
- **Self-documenting code**: Explicit names over comments. Only *why* comments are acceptable.

## Key Rules
- Handler function signature: `def handler(event, context)` or `def lambda_handler(event, context)`
- Dispatch-style functions: document every dispatch key/step value your handler recognizes
- Reuse shared-layer helpers before writing local utility logic — don't fork a copy of shared logic
  into one function's directory
- Follow a **handler/process pattern**: handlers are synchronous API responses, processes are
  workflow-orchestration tasks (adapt to your own runtime model if it differs)
- Tests: unit-test framework of choice + a mocking layer for cloud SDK calls, naming:
  `test_<behavior>_<condition>()`
- Fixtures in `conftest.py` (or your framework's equivalent), mock via your language's standard
  mocking library
- Run tests: `tox` (or your project's test runner)
- Build: define your own CI trigger convention (e.g. a PR comment that kicks off an artifact build)
- Deploy: update the artifact reference in your IaC module → plan → apply
- Commit format / branch format: match whatever convention your `git` agent enforces (see
  `.github/agents/git.agent.md`)
- **Shared layer changes have wide blast radius** — check your dependency-map doc first
- Do NOT import from one function's directory into another — use the shared layer
- Do NOT create new files for feature-specific logic — add to existing modules unless a new module is
  genuinely warranted
