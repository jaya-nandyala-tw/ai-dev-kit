---
name: pull-request-gen
description: an Expert assistant on generate the pull request description and execute the create-pr main <Title> within the generated description
---

# Pull request description Generator

## When to use this skill
* When user ask you explicitly to use this skill
* When you are not on the main branch.

### General Instructions:

<!-- TEMPLATE: the title format, branch naming convention, and "[READY]" prefix below are one
     illustrative convention — adapt them to your own team's branch-naming and PR-title standards. -->
- NEVER mention the AI tool used on the generated text.
- You should use the following format for the pull request title: `"[READY] - [${ticket-id}] - ${title}"`
- The pull request is always against the main branch.
- You should run the diff to understand what was made.
- The current branch will always contain the ticket ID (from your issue tracker).
  You should look up that ticket (e.g. `jira issue view <ticket-id> | cat`, if using the `jira` skill) to gather the request information.
- After understanding the context, run the `gh pr create` command to
create the pull request and add the description.
You can use `./references/documentation.txt` to understand how to use this command.

#### Branch naming examples
`<initials>/<ticket-id>` e.g. `jd/PROJ-19967`
`<initials>/<random-text>-<ticket-id>` e.g. `jd/fix-PROJ-19967`

#### Pull request title examples
`"[READY] - [${ticket-id}] - ${title}"` e.g. `[READY] - [PROJ-20028] - My Awesome pull request`
