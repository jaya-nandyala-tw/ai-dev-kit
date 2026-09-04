---
name: jira
description: Use this skill when asked to manage Jira issues, boards, sprints, or projects using the local 'jira' CLI utility.
allowed_tools:
  - jira, Bash, Read, Grep, Ls, Cat
---

# Jira CLI Integration Skill

You are an expert at using the `jira-cli` (https://github.com/ankitpokhrel/jira-cli). When the user asks about Jira tasks, use the local `jira` command-line tool.

### General Instructions:
<!-- TEMPLATE: fill in your own Jira user ID / email and config path below -->
- My jira user/ID is `<your-email>@<your-org>.com`
- Always use the `jira` command followed by the appropriate subcommand.
- If the project is not specified, the tool uses the default configured in `~/.config/.jira/.config.yml`.
- Use the `--debug` flag if the user asks to troubleshoot a command.
- Always use bullet points on your responses if you received a list
- if the user prompts you to open a card in the browser you should run the `jira open <issue-key>` command
- if the user prompts you to show his/her issues use this command: `jira issue list -a <your-email>@<your-org>.com`
- if you not sure what command or flag to use, run the `jira <command> --help` — this will show a comprehensive list of commands and arguments to use to respond to user prompts
- if the user asks to run a script/command, look at the `./scripts` folder to check if there is a script that can be used to respond to the user prompt; if there is a script, run it and use the output to respond, if there is no script, run `jira <command> --help` to check if there is a command that can be used

### Command Mapping:
- **Issues**: Use `jira issue [list|view|create|move|edit]` for task management.
- **Boards/Sprints**: Use `jira board` and `jira sprint` to manage agile workflows.
- **Navigation**: Use `jira open <issue-key>` to open an issue in the browser.
- **Information**: Use `jira me` to see the current user or `jira serverinfo` for instance details.

### Examples:
- **User**: "List my open issues"
  **Command**: `jira issue list --assignee me --status "To Do"`
- **User**: "Create a new bug titled 'Login fail'"
  **Command**: `jira issue create --type Bug --summary "Login fail"`
- **User**: "Show details for issue PROJ-123"
  **Command**: `jira issue view PROJ-123`
- **User**: "What's the current sprint status?"
  **Command**: `jira sprint list --current`

### Safety:
- Before executing destructive commands (like deleting or moving issues), confirm the parameters with the user.
