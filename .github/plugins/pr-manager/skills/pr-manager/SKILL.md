---
name: pr-manager
description: "Coordinate cross-repo PRs for a single story/ticket. Use when managing branches, commits, and PR sequence across multiple repos (e.g. an app repo, service repos, and IaC repos)."
argument-hint: "TICKET-XXXX ticket number"
---

# PR Manager

Coordinate branches, commits, and PR sequencing across multiple repos for a single story.

`TICKET-XXXX` is a placeholder for your tracker's ticket ID convention — replace consistently below.

## When to Use
- A story touches multiple repos (app + service + IaC)
- You need to create matching branches across repos
- You want to track PR status across the workspace
- You need the correct PR and deploy ordering

## Procedure

### 1. Identify Affected Repos

<!-- TEMPLATE: replace with your own repo layout under codebase/ -->
Based on the story plan, determine which repos need changes:

| Change Type | Repo |
|---|---|
| UI or backend | `codebase/<app-service>/` |
| Background job / function code | `codebase/<function-name>/` |
| Infrastructure | `codebase/<iac-module-repo>/` |
| Shared library | `codebase/<shared-layer>/` |

### 2. Create Branches (same name across all repos)

```bash
BRANCH="TICKET-XXXX-{short-title}"

for repo in <service-a> <service-b> <iac-repo>; do
  cd codebase/$repo
  git checkout main && git pull --ff-only
  git checkout -b $BRANCH
  cd -
done
```

### 3. Implementation Order

Always follow this sequence — each step may depend on the previous. Replace with your own repo names:

| # | Repo | What | Deploy |
|---|---|---|---|
| 1 | `<app-service>` (service) | Backend changes | Auto CI/CD on merge |
| 2 | `<app-service>` (UI) | Frontend changes | Auto CI/CD on merge |
| 3 | `<function-repo>` | Handler/process code | Comment `build` on PR |
| 4 | `<iac-repo>` | Update artifact hash | Comment `terraform plan` → `terraform apply` |

### 4. Commit Conventions

```bash
# Service changes
git add service/
git commit -m "TICKET-XXXX | {feature} service changes"

# UI changes (separate commit in same repo)
git add ui/
git commit -m "TICKET-XXXX | {feature} UI changes"

# Function/lambda changes
git commit -m "TICKET-XXXX | {feature} function changes"

# IaC hash update
git commit -m "TICKET-XXXX | Updated {artifact-name} hash"
```

### 5. Check Story Status Across Repos

Run this to see branch/commit status everywhere — replace the repo glob with your own layout:

```bash
echo "=== Story Status: TICKET-XXXX ==="
for repo in codebase/<app-service> codebase/<function-repo>-* codebase/<iac-repo>; do
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
[TICKET-XXXX](https://<your-org>.atlassian.net/browse/TICKET-XXXX)
```

### 7. Function/Lambda Deploy Sequence (if applicable)

After the function repo's PR is merged:
1. Note the build artifact reference (e.g. a short SHA) from the build output
2. In your IaC repo, find the relevant module/resource file
3. Update the artifact reference to the new build
4. Create the IaC PR → comment `terraform plan` → review → comment `terraform apply`

## Checklist
- [ ] Same branch name (`TICKET-XXXX-{title}`) in all repos
- [ ] Service committed before UI (separate commits)
- [ ] Function/lambda PR merged and built before IaC PR
- [ ] IaC artifact reference updated correctly
- [ ] All repos pushed to origin
- [ ] PR template used with linked ticket

## Rules
- **Redact sensitive information** — never include API keys, passwords, tokens, or secrets in commit messages, PR descriptions, or branch commands. Use environment variable references
- **Never commit credentials** — if a file contains secrets, do not stage it; alert the developer
- **Reference, don't repeat** — PR descriptions should link to the plan file by path rather than duplicating its content
- **One story per branch** — do not mix tickets in a single branch
- **Verify before push** — run the smallest relevant sensor (tests, lint, validate) before pushing
