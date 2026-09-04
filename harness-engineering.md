# Harness Engineering

> **Agent = Model + Harness.** The model provides intelligence; the harness makes it useful. Harness engineering is the practice of designing the environment around a coding agent — prompts, tools, feedback loops, constraints — so it produces reliable, correct output in *your* specific system.

## Objective

Build a system of **guides** (steer before the agent acts) and **sensors** (self-correct after it acts) around your coding agents. Reduce review toil, catch structural drift early, and ensure agents fix their own mistakes before code reaches human eyes.

---

## Principles

1. **Earn each rule.** Every instruction must trace to a past failure or hard constraint. Hand-craft rules — never auto-generate them (auto-generated agentfiles have been shown to hurt performance).
2. **Silent success, verbose failure.** Sensors produce zero output when things pass. On failure, surface the exact error so the agent self-corrects.
3. **Reference, never duplicate.** Your top-level instructions file is a navigation index pointing to specs — not a content wall. Heavy context loads on demand.
4. **Sub-agents are context firewalls.** Use them for context isolation (fresh window, condensed answer back to parent) — not role-play personas.
5. **Codebase wins over guidelines.** When existing code contradicts a guideline, the agent follows the code. The codebase is the source of truth.
6. **Structure in, structure out.** Real file paths, symbol names, existing patterns to follow — the more constrained the input, the more predictable the output.
7. **Promote rules from docs into code.** When a documented rule keeps being violated, escalate it to a linter or structural test. Prose is the starting point; mechanical enforcement is the destination.
8. **Treat the harness as software.** Skills, prompts, instructions, and specs are versioned, reviewed in PRs, and refactored when they drift. A stale prompt rots like a stale test.

---

## Context Rot — watch for these

Context rot = agent reasoning degrades as its context fills with noise. A bigger window doesn't fix it — it makes the haystack larger. Common failure modes to design against:

| Problem | Risk | Mitigation |
|---|---|---|
| **Long-horizon drift** | A long-running orchestrator agent accumulates turns; quality degrades late in session | Story-scoped memory files persist hardened context across sessions |
| **Stale specs** | Constitutions drift from code over time | Diff-based spec refresh when code changes |
| **No per-story scoping** | Agent loads all specs equally for any story | Story memory file contains only the relevant spec extracts for that story |
| **Self-verification bias** | Agent claims broken code is finished | Computational sensors (lint, tests) override self-assessment |
| **Verbose tool outputs** | Large grep/search results clutter context | Constrain output size; offload full results to files |

---

## Worked example: applying this to a real repo

The section below is a genericized snapshot of how this methodology played out in the repo this
starter kit was extracted from — kept as a worked example of what "earning a rule" and "closing a
sensor gap" actually look like in practice, not as a live tracker for *your* repo. Delete or replace
it with your own once you've run this process yourself.

### Sensor evaluation (illustrative)

Scored on a 1-5 scale where higher is better for value and lower is better for effort.

| Sensor Candidate | Value | Effort | Decision | Why |
|---|---:|---:|---|---|
| Add global "verify before finishing" rule | 5 | 1 | Implement now | Immediate reduction in false "done" responses with near-zero churn |
| Add explicit edit→verify→observe→fix loop | 5 | 1 | Implement now | Converts ad hoc verification into repeatable behavior |
| Add "codebase wins" rule | 4 | 1 | Implement now | Prevents unnecessary rewrites of intentional local patterns |
| Create a `/code-review` skill | 4 | 2 | Implement now | Adds reusable inferential sensor for constitution-aware self-review |
| Add pre-commit hooks | 4 | 3 | Defer | Useful but requires team-wide tool/dependency alignment |
| Add architecture-boundary linters (e.g. dep-cruiser, import-linter) | 5 | 4 | Defer | High impact but more setup/remediation effort |
| Split a monolithic workflow spec into per-flow files | 3 | 3 | Defer | Context quality win, but not a direct post-edit sensor |

### What ended up working

| Area | How |
|---|---|
| **Agentfiles** | A short top-level instructions file + several scoped `.instructions.md` files with `applyTo` patterns |
| **Progressive Disclosure** | Skills, agents, and prompt templates loaded on demand only, never all at once |
| **Sub-Agents** | Each named agent scoped to a narrow tool set and a single responsibility |
| **Spec-Driven Context** | Constitutions, domain model, workflows in `specs/` — agent loads one at a time |
| **Independent QA Evaluator** | A no-edit-access agent runs acceptance-criteria sensors with PASS/FAIL, then hands off to inferential code review on pass |
| **Story Lifecycle** | A task approval gate → `plans/active/` → a review gate → `plans/completed/` |

### Recurring gaps worth designing for from day one

| Area | Gap | Typical fix |
|---|---|---|
| **Computational Sensors** | Test/lint commands exist but agents don't auto-run them | A global "verify before finishing" rule |
| **Self-Verification** | Agent can run tests but has no formalized edit→test→fix loop | An explicit completion sensor loop |
| **Plans Directory** | `plans/` exists but has no active/completed structure | An `active/` → `completed/` lifecycle via story memory files |
| **Feedback Sensors** | No post-edit review skill; agent doesn't verify against constitutions | A baseline `/code-review` skill |
| **Architecture Enforcement** | Import boundaries enforced only as prose DO-NOT rules | Structural linters with remediation messages |
| **Pre-commit Hooks** | Nothing intercepts before commit | `pre-commit` — lint, typecheck, fast tests |
| **Story Memory Files** | No durable context across sessions; agent re-discovers context every time | A `plans/active/` lifecycle — created at intake, archived at close |
| **Steering Loop** | No process to turn repeated failures into harness rules | A close-phase step that surfaces rule candidates and delegates the PR |

> **Story memory file lifecycle, as an example:** a story-controller agent creates
> `plans/active/TICKET-XXXX-title.md` at intake (story desc, relevant spec extracts, impact map, task
> template) → the agent updates it during implementation (progress, decisions, errors resolved) → a
> Close stage moves it to `plans/completed/` with lessons appended.

---

## References

- [Böckeler — Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html) (Thoughtworks, Apr 2026)
- [Kulkarni — The Anatomy of an Agent Harness](https://medium.com/@shrinidhikulkarni) (Apr 2026)
- [Bhargava — Your AI Agent Isn't Broken. Your Context Is.](https://www.linkedin.com/pulse/your-ai-agent-isnt-broken-context-piyush-bhargava) (ARCUS / SDD, May 2026)
- [OpenAI — Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering-leveraging-codex/) (OpenAI, Feb 2026)
- [Rizzi — Harness Engineering: Structured Workflows for AI-Assisted Development](https://developers.redhat.com/articles/2025/04/07/harness-engineering-structured-workflows-ai-assisted-development) (Red Hat, Apr 2026)
- [Trivedy — The Anatomy of an Agent Harness](https://blog.langchain.dev/the-anatomy-of-an-agent-harness/) (LangChain, Mar 2026)
