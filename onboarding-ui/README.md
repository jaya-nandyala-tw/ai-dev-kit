# Onboarding Wizard

A local-only, guided setup UI for adopting this starter kit into a new team repo. It replaces
reading `ONBOARDING.md` top to bottom and hand-editing placeholder files with a click-through
wizard that reads and writes the real files in this repo and can run the real setup scripts
for you — nothing here is simulated.

## Local-only, on purpose

This tool shells out to real scripts (git clone, `pre-commit install`, `git rm`) and writes
directly to your checkout of this repo. It binds to `localhost` only and rejects any request
whose `Host` header isn't `localhost`/`127.0.0.1` (see `middleware.ts`). **Never expose it beyond
your own machine** — don't port-forward it, don't put it behind a tunnel, don't deploy it.

## Run it

```bash
cd onboarding-ui
npm install
npm run dev
```

Open http://localhost:3000.

## What it does

- **Tell us about your stack** — a short questionnaire (workers? IaC? Jira?) that determines which
  of the steps below and which agents/skills/scripts in this kit actually apply to your team.
- **Configure & clone repos** — a native repo picker backed by the `gh` CLI, writing
  `config/repos.json` and then running `scripts/clone-repos.sh` with live streamed output.
- **CODEOWNERS, pre-commit config, Sensor Dispatch Table** — structured forms with a
  diff preview before every write. If a file was already hand-edited (no longer matches the
  shipped placeholder), the write requires an extra confirmation and a `.bak-<timestamp>` copy is
  made first.
- **Pre-commit hooks, Talisman** — one-click actions that run the real scripts and stream their
  output, with an inline input box for any prompt they emit.
- **Jira integration** (only shown if your stack uses Jira) — board ID, project key, base URL, and
  API token for `atlassian_client/`.
- **Recommended Resources** — flags agents/skills/instructions/scripts that don't apply
  to your stack (e.g. `atlassian_client/` if you don't use Jira, `lambdas.instructions.md` if you have
  no workers) and lets you remove them via `git rm` (reversible pre-commit via `git status`/
  `git checkout`, since nothing here is destructive until you actually commit).

## How status is computed

Nothing here is trusted client state. `GET /api/status` always re-derives every step's status by
reading the real files/repo/`.git` state (see `lib/detectors.ts`) — if you hand-edit a file
outside this wizard, it picks that up correctly on the next load. `.onboarding-state.json`
(gitignored) only stores your stack-questionnaire answers and a run history/audit log, never the
source of truth for "is this step done."

## If onboarding-ui/ was moved or vendored separately

Repo-root resolution (`lib/paths.ts`) searches upward from wherever you ran `npm run dev` for
known marker files (`scripts/clone-repos.sh`, `config/repos.json`, `ONBOARDING.md`). If that
search fails — e.g. this folder was copied out on its own — set `REPO_ROOT_OVERRIDE` to the real
repo root before starting the dev server.
