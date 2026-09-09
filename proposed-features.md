# Proposed Features

## Next up

The two features below are prioritized ahead of everything else — they compound: Copilot CLI is
the generation engine, Acquire Context is the first real feature that needs one. Ship them
together and Acquire Context has a reason to exist on day one instead of shipping as a paste-box
with nowhere to send its output.

### 1. GitHub CLI — Copilot CLI as a first-class capability

Today `gh` is already a checked prerequisite (repo picker/clone in `ReposStep`) but nothing in the
app invokes intelligence through it. GitHub ships Copilot two ways that both resolve to the same
capability: the `gh copilot` extension (`gh extension install github/gh-copilot`) and, as of late
2025, a standalone `copilot` binary. Detect either — don't force a specific install path.

**Prerequisite check.** Add `copilot` alongside the existing `["git","node","python3","gh","pre-commit"]`
tool list in `lib/detectors.ts` / `PrerequisitesStep.tsx`. Detection order: standalone `copilot
--version`, then `gh copilot --version` as a fallback. If missing, the tile offers a one-click
install action (reusing the existing `RunStep`/`TerminalPane` streamed-script pattern) rather than
just a red X — this is the same "don't just report a problem, offer the fix" instinct behind the
one-click actions everywhere else in this wizard (pre-commit install, talisman init).

**The actual capability, once present.** A small reusable primitive — call it `CopilotSuggest` —
that takes a prompt + context and streams Copilot's output through the same SSE plumbing
`RunStep`/`TerminalPane` already use for `clone-repos.sh`/`pre-commit install`. No new
infrastructure needed; it's the same "run a real command, stream real output, let the user watch"
pattern, just with `copilot suggest -t shell "<prompt>"` (or the JSON-friendly invocation once
Copilot CLI exposes one) as the command instead of a shell script.

First concrete surface for it: a "✨ Suggest with Copilot" affordance next to the free-text fields
that are currently blank-textarea-and-hope — the CI workflow lint/test-step textareas in
`FileFormStep`, the Sensor Dispatch Table's command column. The user still reviews and edits
before anything is written; this only removes the blank-page problem, it doesn't remove the
existing diff-preview-before-write gate.

**Not now:** a full chat/agent surface inside onboarding-ui. That's a different, much bigger
product decision (this wizard is a setup tool, not an IDE) — scope this strictly to
"generate a suggestion into a field I can edit," not "have a conversation."

### 2. Acquire / Review Context

The one existing line on this ("paste a context dump, categorize it, generate specs") is right
but underspecified. Fleshed out:

**What it's for.** The harness's own stated pattern (`HARNESS-ENGINEERING-FRAMEWORK.md`'s
"Spec-Driven Context") assumes a team already has `specs/` written. Nobody starts there — they
start with a pile of meeting notes, a Confluence export, a Slack thread, an old runbook. This
feature is the on-ramp from "context that exists somewhere unstructured" to "a spec the harness
can actually load."

**UI shape — a new standalone page (`/context`), not a wizard step.** The doc already correctly
notes this is a continuous activity, not a one-time setup task, which rules out putting it in the
guided step flow (steps are inherently "done once, in order"). It belongs as its own page,
reachable independent of onboarding progress — the natural long-term home is a navbar item once
the surface area justifies it, but it can ship as a page linked from Recommended Resources or the
homepage first.

**Flow:**
1. **Acquire** — a paste box (plain textarea is enough for v1; drag-and-drop file upload is a
   fast-follow, not a blocker). No categorization required up front — capture first, organize
   second, so the friction of "which bucket does this go in?" never blocks getting the content in
   at all.
2. **Categorize** — tag each dump: Business workflow / Tech or architecture guideline / Domain
   glossary / Team convention / Uncategorized. Offer a Copilot-suggested category (using the
   capability above) as a starting guess the user confirms or overrides — never auto-committed
   without a human looking at it, same trust model as every write in this app.
3. **Store** — save as `specs/context/<category>/<slug>.md` with light frontmatter (`source`,
   `date`, `category`, one-line summary). This lands directly in the directory shape
   `global.instructions.md` already expects specs to live in — the goal is real files the harness
   loads, not a database bolted onto the side of it.
4. **Generate** — per stored item, a "Draft a spec from this" action: Copilot CLI + a canned
   prompt template per category (a business-workflow dump gets a different template than a
   tech-guideline dump). Output lands as a **proposed** file, run through the exact same
   `DiffView`-preview-then-write flow every other managed file in this app already uses — this
   feature doesn't get a special write path, it reuses `managedFiles.ts`'s existing pattern.
5. **List/history** — a Recommendations-page-style list of every acquired dump, its category, and
   whether a spec's been drafted from it yet, so this reads as a living library instead of a
   one-shot form.

**Sequencing note:** step 4 is why this ships *after* Copilot CLI support lands, not in parallel —
without it, "Acquire Context" is just a categorized paste box with nowhere to send its output, and
the actual value (context → spec) doesn't exist yet.

---

## Later / backlog

Everything below is a real idea worth coming back to, just not ahead of the two above.

### Improve Prerequisites step
Rich actions to execute install commands / verify installs inline (not just detect them) — the
same "offer the fix, not just the red X" instinct as the Copilot CLI install action above, applied
to the rest of the prerequisite list (git, node, python3, pre-commit). Makes this wizard something
a team keeps coming back to for re-onboarding new hires, not a one-time-use tool.

### Wizard phases
Team Onboarding vs. User Onboarding vs. Active Development as distinct modes — worth doing once
there's more than one continuous-use feature (Acquire Context will be the first) to actually
justify a mode switch. Premature before that.

### Plan Visualizer / Story Tracker
A plan picker across Active Plans, with two tabs:
- **Workflow** — the plan file rendered as a live workflow diagram (the homepage's new
  `WorkflowDiagram` component is a plain SVG built from static coordinates; this would need a
  real per-plan renderer — D3 or a graph library — driven by actual plan-file state, marking
  completed vs. pending steps with hover tooltips for extracted detail).
- **Dependency graph** — parent epic + sibling stories, current status per story, click a sibling
  to make it the selected plan.

Biggest of the four backlog items — depends on `plans/epics/{KEY}.md` (referenced in the Harness
Hardening work) existing as a reliable, parseable source of truth first.

### Confluence Integration - READ ONLY
Improve aquiring context and doc sync with Confluence data load. Re-use same atlassian token for Jira and Confluence. Rename jira_client to atlassian_client and add confluence integration too.

Features
- Search confluence pages
- Load page content
