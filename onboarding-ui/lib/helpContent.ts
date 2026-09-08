// Static, hand-written docsite-style help content — one entry per step, plus the global "How
// this works" content for the app-wide FAB. Deliberately static (not generated from STEP_DEFS'
// one-line descriptions) because "why does this matter" and "what does it actually touch" need
// real explanation, not a paraphrase of the card summary already on screen.

export type HelpExampleContent = { label: string; content: string };

export type StepHelpContent = {
  why: string[];
  impact: string[];
  examples?: HelpExampleContent[];
};

export const STEP_HELP: Record<string, StepHelpContent> = {
  prerequisites: {
    why: [
      "Confirms the tools every other step depends on are actually installed before you hit a confusing failure three steps in.",
    ],
    impact: [
      "Read-only — this check writes nothing. It only inspects your PATH.",
    ],
    examples: [
      {
        label: "Why it matters downstream",
        content:
          "If gh is missing here, the \"Configure & clone repos\" step won't be able to list your\norg's repos — you'd hit that failure later instead of now.",
      },
    ],
  },

  "stack-profile": {
    why: [
      "Not every team needs every piece of this kit — Lambda conventions don't help a team with no workers, and Jira config is dead weight if you track tickets somewhere else.",
      "Your answers here are what let the rest of the flow skip what doesn't apply to you.",
    ],
    impact: [
      "Saved only to this tool's own local state (.onboarding-state.json, gitignored) — nothing in the repo itself is written.",
      "Controls which optional steps appear in the sidebar and what the Recommended Resources page flags as not-needed.",
    ],
    examples: [
      {
        label: "Example",
        content:
          "Answer \"no\" to workers → .github/instructions/lambdas.instructions.md gets flagged as\nremovable on the Recommended Resources page. Answer \"yes\" → it stays, and the Jira step\nonly appears at all if you answered \"yes\" to Jira.",
      },
    ],
  },

  "repos-config": {
    why: [
      "config/repos.json is the single source of truth for every repo this harness clones, pulls, and lets agents act on across your whole workstream.",
      "Without real repos on disk, path-scoped instructions like codebase/<service>/... have nothing real to apply to.",
    ],
    impact: [
      "Writes config/repos.json.",
      "Once written, running \"Clone repos\" does real `git clone` operations into codebase/ — an actual network call to GitHub, not a simulation.",
    ],
    examples: [
      {
        label: "Example",
        content:
          "Mark billing-service as core and notifications-worker as worker. `--core-only` clones\njust billing-service; `--all` clones both, with notifications-worker landing in\ncodebase/workers/.",
      },
    ],
  },

  "pre-commit-hooks": {
    why: [
      "This is the one real automated guardrail shared by humans and agents alike — it catches lint/format/security issues before they're committed, not after a PR is already open.",
    ],
    impact: [
      "Runs: pip3 install pre-commit && pre-commit install.",
      "Installs the pre-commit tool and writes a git hook into .git/hooks/pre-commit in this repo only — no other repo is touched.",
    ],
    examples: [
      {
        label: "What changes after this runs",
        content:
          "git commit will now auto-run the hooks defined in .pre-commit-config.yaml. A failing hook\nblocks the commit — bypass with `git commit --no-verify` only in a genuine emergency.",
      },
    ],
  },

  "pre-commit-config": {
    why: [
      "The pre-commit hooks ship with placeholder path globs (<service>, <lambdas-or-workers>) that match nothing on disk — they need your team's real directory names before they actually run against your code.",
    ],
    impact: [
      "Writes .pre-commit-config.yaml — specifically the files: glob on each hook, and removes the Terraform hook block entirely if you said you have no IaC repo.",
    ],
    examples: [
      {
        label: "Example",
        content:
          "Service directory: billing-service\n→ files: ^codebase/(billing-service/service|workers/.*)/",
      },
    ],
  },

  "sensor-table": {
    why: [
      "This table tells AI agents exactly which command to run after editing a matching file — without it, agents either skip verification entirely or guess at a command that may not exist.",
    ],
    impact: [
      "Regenerates only the anchored block inside .github/instructions/global.instructions.md (between the sensor-dispatch-table:start/end comments) — the rest of that file's prose and rules are left exactly as they are.",
    ],
    examples: [
      {
        label: "Example row",
        content:
          "Pattern:  codebase/billing-service/src/**/*.py\nCommand:  ruff check {file} && pytest -xvs tests/\nCwd:      codebase/billing-service/\n\n→ @implement runs that exact command after touching a matching file.",
      },
    ],
  },

  jira: {
    why: [
      "Lets @intake auto-fetch a ticket's real title, description, and acceptance criteria directly from Jira instead of you pasting them in by hand every time.",
    ],
    impact: [
      "Writes JIRA_BASE_URL, JIRA_API_TOKEN, and DEV_EMAIL into .env (your personal, gitignored file — never committed).",
      "Writes BOARD_ID and PROJECT into atlassian_client/fetch_my_stories.py and fetch_sprint_stories.py.",
    ],
    examples: [
      {
        label: "After this is set",
        content: "@intake TICKET-1234\n\n→ fetches the real title/description/AC from your Jira board automatically.",
      },
    ],
  },
};

type GlobalHelpGuarantee = { icon: string; text: string };
type GlobalHelpSection =
  | { title: string; icon: string; body: string[] }
  | { title: string; icon: string; guarantees: GlobalHelpGuarantee[] };

// Rendered as its own prominent block at the bottom of the "How this works" dialog, not buried
// as a bullet in "Where to read more" — direct human help deserves more visibility than a link
// in a list.
export const SUPPORT_LINK = {
  label: "Ask in the onboarding Google Chat space",
  url: "https://chat.google.com/room/AAQAl5aoau8?cls=7",
};

export const GLOBAL_HELP: { sections: GlobalHelpSection[] } = {
  sections: [
    {
      title: "What is this?",
      icon: "🧭",
      body: [
        "A local-only setup wizard for adopting the AI Starter Kit into your team's repo. It replaces manually editing placeholder files and running scripts from ONBOARDING.md with a guided, click-through flow — reading and writing the real files in this repo, and running the real setup scripts, live.",
      ],
    },
    {
      title: "Is it actually safe to let this run terminal commands?",
      icon: "🔒",
      guarantees: [
        {
          icon: "🏠",
          text: "Localhost-only. The server rejects any request whose Host header isn't localhost/127.0.0.1 — it can't be reached from outside your machine, even on a shared network.",
        },
        {
          icon: "✋",
          text: "Nothing runs automatically. Every mutating action — a file write or a script run — shows an explicit confirmation first, listing exactly what will change or execute, before anything happens.",
        },
        {
          icon: "👁️",
          text: "Every file write shows a diff first. You see the exact before/after before it's applied, and a timestamped .bak copy is made automatically if the file already existed.",
        },
        {
          icon: "📌",
          text: "Only known, fixed scripts run — the same ones already shipped in this repo's scripts/ folder (clone-repos.sh, pre-commit install, talisman -i), plus git rm for the Recommended Resources cleanup. Nothing is built from free text, so there's no command-injection surface.",
        },
        {
          icon: "🌐",
          text: "Network calls only happen when you ask for them. Cloning repos talks to GitHub because that step needs to — nothing else here reaches the network on its own.",
        },
        {
          icon: "🚫",
          text: "It's a plain local Next.js app. Nothing obfuscated, no telemetry, no phoning home — the entire source is in onboarding-ui/ if you want to read it yourself.",
        },
      ],
    },
    {
      title: "What's reversible",
      icon: "↺",
      body: [
        "File writes: reversible via the automatic .bak-<timestamp> backup, or `git checkout` if the file was already tracked.",
        "git rm (Recommended Resources cleanup): reversible via `git status` / `git checkout` as long as you haven't committed yet.",
        "Cloning repos, installing pre-commit hooks, running talisman -i: safe to re-run — none of them are destructive to re-trigger.",
      ],
    },
    {
      title: "Where to read more",
      icon: "📚",
      body: [
        "onboarding-ui/README.md — how this wizard works under the hood.",
        "README.md / ONBOARDING.md at the repo root — the full starter kit and its manual adoption checklist.",
      ],
    },
  ],
};
