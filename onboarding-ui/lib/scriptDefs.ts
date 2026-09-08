import { REPO_ROOT } from "./paths";

export type PromptPattern = { pattern: RegExp; prompt: string };

export type ScriptDef = {
  /** Human label shown in confirm modals. */
  label: string;
  command: string;
  baseArgs: string[];
  cwd: string;
  env?: Record<string, string>;
  /**
   * Best-effort literal-prompt matchers for scripts known to block on stdin. This is a
   * convenience, not the primary mechanism — the idle-output heuristic in processRegistry.ts
   * (no newline-terminated output for ~600ms) is what actually catches an unrecognized prompt,
   * since exact prompt wording can drift as scripts change.
   */
  promptPatterns?: PromptPattern[];
  /** True if running this again over already-applied state has real side effects worth a
   * stronger confirmation upstream in the UI (re-clone, deletion, credential writes). */
  destructive?: boolean;
};

const SCRIPTS: Record<string, ScriptDef> = {
  "clone-repos": {
    label: "Clone configured repos",
    command: "bash",
    baseArgs: [`${REPO_ROOT}/scripts/clone-repos.sh`],
    cwd: REPO_ROOT,
    promptPatterns: [{ pattern: /\[Y\/n\]/i, prompt: "SSH clone failed — fall back to HTTPS?" }],
  },
  "pre-commit-install": {
    label: "Install pre-commit and its git hook",
    command: "bash",
    baseArgs: ["-c", "pip3 install pre-commit && pre-commit install"],
    cwd: REPO_ROOT,
  },
  "talisman-init": {
    label: "Generate .talismanrc checksums",
    command: "talisman",
    baseArgs: ["-i"],
    cwd: REPO_ROOT,
  },
  "git-rm": {
    label: "Remove files not needed for your stack",
    command: "git",
    baseArgs: ["rm", "-r"],
    cwd: REPO_ROOT,
    destructive: true,
  },
};

export function getScriptDef(key: string): ScriptDef | undefined {
  return SCRIPTS[key];
}

export function listScriptKeys(): string[] {
  return Object.keys(SCRIPTS);
}
