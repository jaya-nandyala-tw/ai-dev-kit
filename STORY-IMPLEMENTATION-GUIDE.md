# Story Implementation Guide

> How to implement work in this repo from story intake through validation, PRs, and harness improvements.

<!-- GENERICIZED TEMPLATE — this guide narrates the agent workflow defined in .github/agents/ and
     .github/skills/. Fill in your own tracker key format (TICKET-XXXX below), spec paths, and any
     stack-specific scope questions (this repo's origin had a feature-toggle scope question; adapt or
     remove it if your stack doesn't have an equivalent). -->

## Why This Guide Exists

Use this guide when you are starting any ticket-backed change. It covers:

- New feature stories
- Enhancements to existing behavior
- Bug fixes and regressions

The goal is to use the harness consistently so planning, implementation, testing, and documentation stay repeatable across every layer of your stack (UI, service, workers, IaC).

## Pick the Right Workflow

### New Feature Story

Use the full workflow when the story adds net-new user-facing capability, a new endpoint, a new screen, a new data model, a new worker step, or a new integration path.

Typical signals:

- New UI surface or major UI flow change
- New backend endpoint or domain service
- New feature toggle
- New database fields or tables
- New worker behavior or IaC resource updates

### Enhancement

Use a lighter version of the full workflow when the story extends or refines existing behavior without introducing a brand-new product capability.

Typical signals:

- Extending an existing API contract
- Adding fields to an existing form or response
- Improving validation, usability, or workflow details
- Adding logic to an existing screen, service, or worker path

### Bug Fix

Use the shortest path that still proves root cause and regression coverage. Bug fixes usually do not need a feature toggle or a broad design exercise, but they still need a plan, targeted validation, and spec updates if product behavior changed.

Typical signals:

- Existing behavior is broken or inconsistent
- Acceptance criteria focus on restoring intended behavior
- No new capability is introduced

## Start With Intake

Before writing code, collect the minimum information needed to constrain the work:

1. Ticket number in `TICKET-XXXX` format (your own tracker's key format)
2. Story description in plain language
3. Acceptance criteria
4. Scope classification: **new feature/epic, tech design/spike, independent story, enhancement, or
   bug fix/hotfix** — this 5-way question is asked automatically by `@groom` before anything else,
   so you don't need to pre-decide it, but knowing the categories helps you answer it quickly
5. Expected repos affected: UI, service, workers, IaC, or multiple
6. Any stack-specific scope question your team needs answered up front (e.g. feature-toggle scope)

If the work is larger than one story, treat it as a feature with multiple stories and plan dependency order first — and if it sits under an Epic, say so up front: grooming will check `plans/epics/{EPIC-KEY}.md` for decisions already made by sibling stories under the same epic (see § Epics & Related Stories below).

## Phase 1: Plan the Story With the Harness

Use `@story` first, the same as always. Internally, `@story` now delegates the entire intake step to
`@groom` — you'll see it run classification, ticket fetch, spec loading, and interrogation before a plan
exists. This is expected, not an extra step you need to trigger yourself.

Example prompts:

```text
@story Plan TICKET-8123: add archival status to the workspace details page.
```

```text
@story This is a bug fix. Plan TICKET-8124: owner dropdown does not save in Edit Details. Acceptance criteria: ...
```

What `@groom` (via `@story`) should do:

- Ask the 5-way classification question and route to the matching plan template — a Spike Plan and a
  Bug/Hotfix Plan are real templates, not just informal naming conventions
- Load the relevant specs
- Search current code paths
- Check `plans/epics/{EPIC-KEY}.md` if the story belongs to a known epic, and surface any shared
  decisions already recorded there before asking you to re-decide them
- Ask clarifying questions before implementation
- Confirm any stack-specific scope question (e.g. toggle scope)
- Recommend a feature toggle for new features or significant enhancements, if your stack uses them

What `@story` then does with that handoff:

- Produce a plan file in `plans/active/` (via the `plan-story` skill)
- Hold the task list at the approval gate until you explicitly say `proceed` — no code gets written
  before that, and `@implement` will mechanically refuse to run on a plan that isn't approved yet

## Epics & Related Stories

If a story is part of an Epic, `@groom` fetches `epic_key`/`epic_name` from your tracker and checks for
`plans/epics/{EPIC-KEY}.md` — the structured index of every story under that epic, its shared
decisions, and a steering log. If the index exists, you'll be shown its shared decisions before
grooming continues; if it doesn't exist yet and this is new-feature/epic work, `@groom` offers to
create one. Don't hand-edit that file's child-story table — it's regenerated by the `epic-drift-check`
skill, which runs automatically (not "if someone remembers to") whenever a plan's `## Decisions`
table changes on a story with a non-empty `Epic:` field.

Expected plan output:

- Story summary and decisions
- Repos affected
- Proposed branch name and commit prefix
- Ordered implementation steps by repo
- Test plan
- PR sequence
- Mock data or seed data tasks if needed

## Phase 2: Decide the Shape of the Change

### For New Feature Stories

Do all of the following unless the story clearly does not apply:

1. Confirm whether the feature needs a feature toggle (if your stack has one). Prefer a toggle for new user-facing capability or any work that may merge before release.
2. Identify all affected repos up front. New features often cross UI, service, mock layer, workers, and IaC.
3. Confirm whether local dev needs mock data or seed data updates.
4. Confirm whether specs need a new API contract, workflow update, feature inventory entry, or architecture guidance.
5. If the UI is significant, include a visual design section in the plan.

### For Enhancements

Usually do the following:

1. Extend the existing implementation path instead of inventing a parallel one.
2. Reuse the current endpoint, screen, service, or worker when possible.
3. Add a feature toggle only if rollout risk or release timing justifies it.
4. Update your mock layer when local dev behavior depends on changed backend or infra responses.
5. Update specs when the enhancement changes expected behavior, contracts, or architecture rules.

### For Bug Fixes

Usually do the following:

1. Write the root cause into the plan in one or two lines.
2. Keep the implementation narrow and local.
3. Add regression coverage for the failing behavior.
4. Skip feature toggle work unless the fix is unusually risky.
5. Update specs only if the existing spec is wrong or the intended behavior was undocumented.

## Phase 3: Implement Repo by Repo

Follow the plan in the order it defines. `@story` now runs this as a per-task loop: it hands one task
(description + exact file list) to `@implement`, which makes just that edit and reports back — it does
not carry the accumulated context of every earlier task, and it does not decide what happens next.
`@story` then decides whether `@test` is needed, delegates the commit to `@git`, and checks whether an
epic-linked decision changed (triggering `epic-drift-check` automatically if so) before moving to the
next task. You don't need to invoke `@implement` yourself, and it will refuse to if you try to point it
at a story whose plan isn't `Phase: approved` yet.

### Branching and Commits

- Create story-scoped branches using your branching strategy
- Use the ticket ID in the branch name
- Use the ticket ID in commit messages

### UI Work

- Follow your own frontend placement conventions (fill in your own equivalent of a "where new screens go" doc)
- Use existing patterns before introducing new abstractions
- Add or update tests for behavior changes

### Service Work

- Follow your own architecture pattern (DDD, layered, etc.) as documented in your service constitution
- Update DTOs, services, DAOs, and tests together
- Update your mock layer whenever local test scenarios depend on changed infra responses

### Worker/Lambda Work

- Keep production logic function-based
- Reuse shared library utilities before adding local helpers
- Add tests for every behavior change and regression
- If the worker artifact changes, plan the paired IaC hash/version update PR

### IaC Work

- Update Terraform only after the code artifact or infra requirement is ready
- Run formatting and validation checks
- Never skip the plan step in normal delivery

## Phase 4: Validate Before You Say Done

The harness standard is edit, verify, observe, fix, re-verify.

Minimum expectation:

1. Run the narrowest relevant test or validation command for each changed repo.
2. If that fails, fix the same slice before expanding scope.
3. Repeat until passing or explicitly blocked.

Examples:

- UI: targeted Jest or RTL tests
- Service: targeted pytest
- Workers: `tox` or targeted pytest with moto
- IaC: `terraform fmt -check` and `terraform validate`

If no automated check exists, record the highest-signal manual verification you performed.

## Phase 5: Review With the Harness

Before opening PRs, run a self-review pass.

Recommended checks:

1. Use the `code-review` skill to look for regressions, constitution violations, and missing tests.
2. Re-read the acceptance criteria and confirm each item is covered by code or validation.
3. Confirm your mock layer, seed data, and specs are updated if the story needed them.
4. Confirm the plan file in `plans/` still reflects what was actually implemented.

## Phase 6: Open PRs in the Right Sequence

`@git` checks the plan before it will push or help open a PR — it refuses unless the plan's
`## Status` shows `Phase: closing` or later. If you're blocked here, the story hasn't actually cleared
the Code Review Gate yet; go back and finish that first rather than pushing around the check.

Typical order (adapt to your own repo topology):

1. UI and service PRs first when product behavior changes are local to the main stack
2. Worker PR before IaC PR when deployment artifacts change
3. IaC PR after the new artifact hash/version is available

For worker changes, remember the normal two-PR model:

1. Worker repo PR for code and artifact build
2. IaC repo PR for the new artifact hash/version

Include in each PR:

- Ticket ID
- Short change summary
- Validation performed
- Any manual test steps
- Spec or harness updates included in the same change, if applicable

## Phase 7: Close the Story Cleanly

Before considering the work complete:

1. Ensure the plan in `plans/` reflects the final implementation
2. Ensure relevant specs are updated — if any task touched a `specs/` file, `@story` invokes
   `@doc-garden` automatically for a gap-check before archiving; you'll still be asked before it
   writes anything, same as if you'd called it yourself
3. Ensure tests were added or updated
4. Ensure mock layer or seed data changes are included when required
5. Review the `## Lessons` section — `@story` auto-drafts it from the plan's own Steering Log and any
   Verify/Review failures logged during the story, so you're confirming or editing a real draft
   instead of composing one from memory. A bare "ok" doesn't count as confirming it; say "confirmed
   as-is" or make the edit.

## When to Update Specs

Treat spec updates as part of the implementation, not follow-up cleanup.

Update specs when you add or materially change:

- User-facing behavior
- API contracts
- Data models
- Workflow steps
- Repo placement rules
- Architecture constraints or conventions

Common locations (fill in your own spec tree):

- `specs/product/feature-inventory.md`
- `specs/product/business-workflows.md`
- `specs/<service>/api-contracts.md`
- `specs/<service>/data-models.md`
- `specs/<service>/ui-constitution.md`
- `specs/<service>/service-constitution.md`
- `specs/<worker-layer>/dependency-map.md`
- `specs/<worker-layer>/constitution.md`
- `specs/<iac-layer>/constitution.md`

## When to Improve Agents, Skills, and Instructions

If you notice a missing repeatable pattern, do not leave it as tribal knowledge.

Enhance the harness when you see:

- The same clarification is needed story after story
- The same repo routing mistake happens more than once
- The same validation step is repeatedly forgotten
- The same file placement mistake recurs
- The same type of scaffold is being built manually each time
- The same review feedback appears across multiple PRs

Where to put the improvement:

- Update `specs/` when the missing pattern is product, workflow, contract, or architecture truth
- Update `.github/instructions/` when the agent needs better repo- or path-scoped rules
- Update `.github/agents/` when the planning or execution workflow itself should change
- Update `.github/skills/` when a repeatable multi-step task should become a reusable workflow
- Add or improve validation commands when a prose rule should become a sensor

Rule of thumb:

- If humans need to remember it, put it in a spec or instruction
- If the agent should repeatedly perform it, put it in an agent or skill
- If failures should be caught automatically, add or improve a sensor

## Quick Start Checklist

### New Feature Story

1. Run `@story` and get a plan into `plans/`
2. Confirm any stack-specific scope question and whether a new feature toggle is needed
3. Identify all affected repos and mock-data needs
4. Implement repo by repo
5. Run targeted validation in each touched repo
6. Update specs and harness docs if the pattern is new or changed
7. Run review, open PRs, and record final validation

### Enhancement

1. Run `@story` and confirm the existing implementation path
2. Decide whether rollout risk justifies a feature toggle
3. Extend the existing code path instead of creating a new one
4. Update your mock layer and specs if behavior changes
5. Validate narrowly, review, and open PRs

### Bug Fix

1. Run `@story` with the bug context and acceptance criteria
2. Capture the root cause in the plan
3. Make the smallest root-cause fix
4. Add regression coverage
5. Validate the failing slice, then open the PR

## Examples

- New feature: a new approval experience spanning UI, service, mock layer, and feature toggle work
- Enhancement: add one more filter to an existing data table and extend the current API response
- Bug fix: hide or re-enable an existing field based on a known state without changing contracts or models

## Final Principle

Do not treat the harness as static documentation. Specs, agents, skills, and sensors are part of the product delivery system. When you see a missing repeatable pattern, improve the harness so the next story is easier, faster, and safer.
