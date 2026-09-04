---
name: epic-drift-check
description: "Detect and repair epic-level decision drift across sibling stories. Use whenever a plan's ## Decisions table changes and that plan has a non-empty Epic: field — registry topology, shared-module ownership, auth model, descriptor routing, or a cross-story dependency decision changing mid-epic."
argument-hint: "EPIC-KEY, the changed decision, and the plan file where it changed"
---

<!--
GENERICIZED TEMPLATE — the "Lesson source" callout at the bottom cites real tickets from
the repo this pattern was extracted from. It's kept as an illustrative example of *why*
this guardrail exists (a real, repeated failure mode: decisions changing mid-epic without
propagating to sibling stories). Replace it with your own team's incident once you have one,
or remove it if you'd rather not carry an example that isn't yours.
-->

# Epic Drift Check

Propagate a changed decision to every sibling plan under the same epic, mechanically — this guardrail
exists because "update the epic index later" tends not to happen once a story is in flight, so this
check is unconditional, not judgment-based. Any caller (`@story`, `@groom`, `@implement`) that edits a
plan's `## Decisions` table where the plan has a non-empty `Epic:` field **must** invoke this skill
immediately, before continuing — it is not something an agent decides to do if it notices.

## Trigger conditions

Invoke this skill when any of the following changes mid-epic:

- Registry topology or environment mapping (e.g. env var schema, registry ID variables)
- Shared module ownership (e.g. which story owns a client module or IAM configuration)
- Auth model or token-handling strategy
- Descriptor routing or classification logic
- Cross-story dependency decisions (e.g. which story owns what)

## Procedure

### 1. Locate the epic index

Read `plans/epics/{EPIC-KEY}.md`. This is the source of truth for "which stories share this epic" —
**do not** grep `plans/active/*.md` for a free-text `Epic:` string; a free-text field is rarely
populated consistently across every plan, and it's never a structured link.

If `plans/epics/{EPIC-KEY}.md` does not exist, there is no sibling-tracking to do — report that no
epic index was found for `{EPIC-KEY}` and stop (this can happen for a pre-epic-index-era plan; do not
fall back to grepping).

### 2. Diff every sibling plan

For each row in the index's child-story table:

1. Open that plan file's `## Decisions` table.
2. Compare it against the decision that just changed.
3. If the sibling's decision is stale, update it in place and append a `## Steering Log` entry:
   ```
   - {date} — Epic drift: {decision} changed in {source plan/ticket}; updated here from
     "{old value}" to "{new value}".
   ```

### 3. Update the epic index itself

Append the same decision change to the epic index's own shared `## Decisions` table and its
`## Steering Log`, so the next story groomed under this epic sees it without re-deriving it.

### 4. Report before resuming

Before the caller resumes implementation, report every plan that was updated (or confirm none needed
updating) — this must reach the developer, not just get silently written to disk.

## Constraints

- **Never hand-edit** `plans/epics/{KEY}.md`'s child-story table — it is derived, regenerated only by
  this skill or a phase-change event on a child plan.
- Run this check even if it turns out no sibling plan is stale — the report "checked N sibling plans,
  none stale" is itself the signal that the mechanism ran, not just that nothing happened to be wrong.

> **Lesson source (illustrative, from the repo this pattern was extracted from):** a cluster of
> related tickets whose epic-level pivots propagated silently; each sibling story required manual
> review and correction to stay consistent. Most of that repo's recorded `## Lessons` entries traced
> to this exact root cause — which is the origin story for making this check mandatory rather than
> judgment-based. Swap in your own team's equivalent incident here once you have one.
