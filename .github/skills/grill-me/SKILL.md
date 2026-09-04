---
name: grill-me
description: "Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions 'grill me'."
argument-hint: "A plan, design doc, architecture decision, or feature description to interrogate"
---

# Grill Me — Design Interrogation Skill

Interview the user relentlessly about every aspect of their plan until reaching shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

## When to Use
- User says "grill me", "stress-test this plan", "poke holes in my design"
- User presents a plan or architecture and wants it challenged
- Before committing to a large implementation to surface blind spots

## Procedure

### 1. Load Context
- Read the plan/design provided by the user (inline text, plan file, or spec reference)
- If the plan references existing codebase components, explore the codebase to ground questions in reality
- Check `/memories/repo/` indexes for relevant data models, routes, API endpoints, and toggles

### 2. Identify Decision Branches
Decompose the plan into a decision tree:
- **Data model** — entities, relationships, migrations
- **API surface** — endpoints, contracts, auth, versioning
- **UI/UX** — screens, flows, states, error handling
- **Infrastructure** — deployment, scaling, cost, permissions
- **Integration** — dependencies, downstream effects, blast radius
- **Testing** — strategy, coverage gaps, edge cases
- **Rollout** — feature flags, migration path, rollback plan

### 3. Interrogate One Question at a Time

For each question:
1. State the question clearly
2. Provide your **recommended answer** based on codebase conventions and domain knowledge
3. Wait for the user's response before moving to the next question

**Rules:**
- Ask ONE question at a time — do not batch
- If a question can be answered by exploring the codebase, explore it yourself and state what you found instead of asking
- Resolve dependency chains: if Decision B depends on Decision A, ask A first
- Challenge vague answers — push for specifics (table names, endpoint paths, component names)
- When the user's answer conflicts with existing patterns, flag it and ask them to justify the deviation
- Track resolved decisions as you go

### 4. Summarize Shared Understanding

Once all branches are resolved, produce a compact summary:

```
## Resolved Decisions

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | ... | ... |
| 2 | ... | ... |

## Open Items (if any)
- ...

## Recommended Next Step
- ...
```

## Behavioral Notes
- Be direct and concise — no filler
- Prioritize high-risk decisions first (data model changes, breaking API changes, shared layer modifications)
- If the plan touches shared infrastructure (a shared library, common UI components, a platform team's module), escalate those questions first due to blast radius
- Reference existing specs and constitutions when challenging decisions
