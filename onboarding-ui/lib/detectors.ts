import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { repoPath } from "./paths";
import { readState } from "./stateStore";
import * as T from "./templates";
import type { OnboardingState, StepStatusEntry } from "@/types";

function exists(relPath: string): boolean {
  return fs.existsSync(repoPath(relPath));
}

function read(relPath: string): string {
  try {
    return fs.readFileSync(repoPath(relPath), "utf8");
  } catch {
    return "";
  }
}

function commandExists(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

type ReposDoc = {
  github?: { org?: string };
  repos?: Array<{ name: string; tier: "core" | "worker" }>;
};

function readReposDoc(): ReposDoc | null {
  const raw = read("config/repos.json");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReposDoc;
  } catch {
    return null;
  }
}

// Detects either install path GitHub ships Copilot CLI through: the standalone `copilot` binary,
// or the `gh copilot` extension — neither is a simple PATH lookup for the extension case, so this
// isn't just another entry in the flat `tools` list below.
function copilotCliAvailable(): boolean {
  if (commandExists("copilot")) return true;
  try {
    execFileSync("gh", ["copilot", "--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function prerequisites(): StepStatusEntry {
  const tools = ["git", "node", "python3", "gh", "pre-commit"];
  const missing = tools.filter((t) => !commandExists(t));
  if (!copilotCliAvailable()) missing.push("copilot");
  return {
    id: "prerequisites",
    status: missing.length === 0 ? "done" : "partial",
    detail: missing.length === 0 ? "All checked tools found on PATH" : `Missing: ${missing.join(", ")}`,
  };
}

function stackProfile(state: OnboardingState): StepStatusEntry {
  return { id: "stack-profile", status: state.profile ? "done" : "not-started" };
}

function reposConfig(): StepStatusEntry {
  const doc = readReposDoc();
  const org = doc?.github?.org ?? "";
  const repos = doc?.repos ?? [];
  const isPlaceholder = !org || org === "<your-github-org>" || repos.length === 0;
  return {
    id: "repos-config",
    status: isPlaceholder ? "not-started" : "done",
    detail: isPlaceholder ? "config/repos.json still has placeholder values" : `${repos.length} repo(s) configured`,
  };
}

function cloneRepos(reposStatus: StepStatusEntry): StepStatusEntry {
  if (reposStatus.status !== "done") {
    return { id: "clone-repos", status: "locked", lockedReason: "Configure repos first" };
  }
  const doc = readReposDoc();
  const repos = doc?.repos ?? [];
  const cloned = repos.filter((r) => {
    const dir = r.tier === "worker" ? `codebase/workers/${r.name}` : `codebase/${r.name}`;
    return exists(dir);
  });
  if (repos.length === 0) return { id: "clone-repos", status: "not-started" };
  if (cloned.length === repos.length) return { id: "clone-repos", status: "done", detail: `${cloned.length}/${repos.length} cloned` };
  if (cloned.length > 0) return { id: "clone-repos", status: "partial", detail: `${cloned.length}/${repos.length} cloned` };
  return { id: "clone-repos", status: "not-started" };
}

function preCommitHooks(): StepStatusEntry {
  const hook = read(".git/hooks/pre-commit");
  const installed = hook.includes("pre-commit.com");
  return { id: "pre-commit-hooks", status: installed ? "done" : "not-started" };
}

function codeowners(): StepStatusEntry {
  const current = read("CODEOWNERS");
  const hasRule = current
    .split("\n")
    .some((l) => l.trim() && !l.trim().startsWith("#"));
  return { id: "codeowners", status: hasRule ? "done" : "not-started" };
}

function preCommitConfig(): StepStatusEntry {
  const current = read(".pre-commit-config.yaml");
  const stillPlaceholder = current.includes("<service>") || current.includes("<lambdas-or-workers>");
  return { id: "pre-commit-config", status: !current || stillPlaceholder ? "not-started" : "done" };
}

function sensorTable(): StepStatusEntry {
  const current = read(".github/instructions/global.instructions.md");
  const stillPlaceholder = current.includes("<service>/src/**/*.py");
  return { id: "sensor-table", status: !current || stillPlaceholder ? "not-started" : "done" };
}

function talisman(): StepStatusEntry {
  const current = read(".talismanrc");
  const untouched = !current || /fileignoreconfig:\s*\[\]/.test(current);
  return { id: "talisman", status: untouched ? "not-started" : "done" };
}

function jira(state: OnboardingState): StepStatusEntry {
  if (!state.profile?.usesJira) return { id: "jira", status: "locked", lockedReason: "Not needed for your stack" };
  const hasEnv = isAtlassianConfigured();
  const my = read("atlassian_client/fetch_my_stories.py");
  const hasBoard = /BOARD_ID = [1-9]/.test(my);
  if (hasEnv && hasBoard) return { id: "jira", status: "done" };
  if (hasEnv || hasBoard) return { id: "jira", status: "partial" };
  return { id: "jira", status: "not-started" };
}

// Confluence reuses the same Jira/Atlassian credentials (see atlassian_client/config.py) — this
// is the single source of truth for "can the Acquire Context page's Confluence tab be enabled",
// used both by the jira() step status above and by the /api/context/confluence/status route.
export function isAtlassianConfigured(): boolean {
  const env = read(".env");
  return /JIRA_BASE_URL=\S/.test(env) && /JIRA_API_TOKEN=\S/.test(env);
}

export function computeAllStatuses(): { state: OnboardingState; statuses: Record<string, StepStatusEntry> } {
  const state = readState();
  const reposStatus = reposConfig();
  const entries = [
    prerequisites(),
    stackProfile(state),
    reposStatus,
    cloneRepos(reposStatus),
    preCommitHooks(),
    codeowners(),
    preCommitConfig(),
    sensorTable(),
    talisman(),
    jira(state),
  ];
  const statuses: Record<string, StepStatusEntry> = {};
  for (const e of entries) statuses[e.id] = e;
  return { state, statuses };
}
