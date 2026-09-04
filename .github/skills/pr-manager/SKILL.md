---
name: pr-manager
description: "Coordinate cross-repo PRs for a single story. Use when managing branches, commits, and PR sequence across a service repo, worker/lambda repos, and IaC repos."
argument-hint: "TICKET-XXXX ticket number"
---

<!--
GENERICIZED TEMPLATE — fill in your own repo names/paths everywhere you see
`<service-name>`, `<worker-name>`, `<iac-repo>`, and your own Jira/tracker base URL.
-->

# PR Manager

Coordinate branches, commits, and PR sequencing across multiple repos for a single story.

## When to Use
- A story touches multiple repos (service + worker + IaC)
- You need to create matching branches across repos
- You want to track PR status across the workspace
- You need the correct PR and deploy ordering

## Procedure

### 1. Identify Affected Repos

Based on the story plan, determine which repos need changes:

| Change Type | Repo |
|---|---|
| UI or backend | `codebase/<service-name>/` |
| Worker/Lambda code | `codebase/<worker-name>/` |
| Infrastructure | `codebase/<iac-repo>/` |
| Shared layer | `codebase/<shared-layer-repo>/` |

### 2. Create Branches (same name across all repos)

```bash
BRANCH="TICKET-XXXX-{short-title}"

for repo in <service-name> <worker-name> <iac-repo>; do
  cd codebase/$repo
  git checkout main && git pull --ff-only
  git checkout -b $BRANCH
  cd -
done
```

### 3. Implementation Order

Always follow this sequence — each step may depend on the previous:

| # | Repo | What | Deploy |
|---|---|---|---|
| 1 | `<service-name>` (service) | Backend changes | Auto CI/CD on merge |
| 2 | `<service-name>` (UI) | Frontend changes | Auto CI/CD on merge |
| 3 | `<worker-name>` | Handler/process code | Your worker's build trigger |
| 4 | `<iac-repo>` | Update artifact hash/version | Your IaC apply flow |

### 4. Commit Conventions

```bash
# Service changes
git add service/
git commit -m "TICKET-XXXX | {feature} service changes"

# UI changes (separate commit in same repo)
git add ui/
git commit -m "TICKET-XXXX | {feature} UI changes"

# Worker/Lambda changes
git commit -m "TICKET-XXXX | {feature} worker changes"

# IaC hash/version update
git commit -m "TICKET-XXXX | Updated {artifact-name} artifact hash"
```

### 5. Check Story Status Across Repos

Run this to see branch/commit status everywhere:

```bash
echo "=== Story Status: TICKET-XXXX ==="
for repo in codebase/<service-name> codebase/<worker-name>* codebase/<iac-repo>; do
  if [[ -d "$repo/.git" ]]; then
    branch=$(git -C "$repo" branch --list "TICKET-XXXX*" 2>/dev/null | tr -d ' *')
    if [[ -n "$branch" ]]; then
      commits=$(git -C "$repo" log --oneline main..$branch 2>/dev/null | wc -l | tr -d ' ')
      pushed=$(git -C "$repo" log --oneline origin/$branch..$branch 2>/dev/null | wc -l | tr -d ' ')
      echo "✓ $(basename $repo): $branch ($commits commits, $pushed unpushed)"
    fi
  fi
done
```

### 6. Push and PR

```bash
git push -u origin TICKET-XXXX-{short-title}
```

PR template:
```
## TICKET-XXXX — {Story title}

### Changes
- {bullet list}

### Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed

### Linked Story
[TICKET-XXXX](https://<your-jira-instance>.atlassian.net/browse/TICKET-XXXX)
```

### 7. Worker/Lambda Deploy Sequence (if applicable)

After the worker PR is merged:
1. Note the build artifact identifier (e.g. commit SHA) from the build output
2. In `<iac-repo>`, find the relevant `.tf` file
3. Update the artifact reference with the new identifier
4. Create IaC PR → plan → review → apply, per your own IaC workflow

## Checklist
- [ ] Same branch name (`TICKET-XXXX-{title}`) in all repos
- [ ] Service committed before UI (separate commits)
- [ ] Worker PR merged and built before IaC PR
- [ ] IaC artifact reference updated with correct identifier
- [ ] All repos pushed to origin
- [ ] PR template used with linked ticket

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, or secrets in commit messages, PR descriptions, or branch commands. Use environment variable references
- **Never commit credentials** — if a file contains secrets, do not stage it; alert the developer
- **Reference, don't repeat** — PR descriptions should link to the plan file by path rather than duplicating its content
- **One story per branch** — do not mix tickets in a single branch
- **Verify before push** — run the smallest relevant sensor (tests, lint, validate) before pushing
