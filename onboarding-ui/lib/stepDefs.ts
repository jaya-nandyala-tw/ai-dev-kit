// Client-safe step metadata (no Node imports) — the dashboard and detail pages both read this.
// Status per step comes from GET /api/status (server-computed via lib/detectors.ts); this file
// only describes what to show, in what order, and how steps relate to each other.

export type StepKind =
  | "prerequisites"
  | "questionnaire"
  | "repos"
  | "run"
  | "file-form"
  | "workspace"
  | "profile"
  | "aws";

export type StepDef = {
  id: string;
  title: string;
  /** Short (~3-5 word) label used in the rail/timeline where space is tight. */
  shortTitle: string;
  description: string;
  kind: StepKind;
  group: "required" | "optional";
  icon: string;
  /** Only shown/enabled when the profile answer(s) evaluate true. Omit for always-shown steps. */
  showWhen?: (profile: Record<string, boolean> | null) => boolean;
};

export const STEP_DEFS: StepDef[] = [
  {
    id: "prerequisites",
    title: "Prerequisites check",
    shortTitle: "Prerequisites",
    description: "Confirm git, node, python3, docker, aws, gh, and pre-commit are on your PATH.",
    kind: "prerequisites",
    group: "required",
    icon: "🧰",
  },
  {
    id: "stack-profile",
    title: "Tell us about your stack",
    shortTitle: "Your stack",
    description: "A few quick questions that tailor everything else to your team.",
    kind: "questionnaire",
    group: "required",
    icon: "🧭",
  },
  {
    id: "repos-config",
    title: "Configure & clone repos",
    shortTitle: "Repos",
    description: "Pick which GitHub repos this harness should manage, then clone them.",
    kind: "repos",
    group: "required",
    icon: "📦",
  },
  {
    id: "pre-commit-hooks",
    title: "Pre-commit hooks",
    shortTitle: "Pre-commit",
    description: "Install pre-commit and its git hook — a safety net for every commit.",
    kind: "run",
    group: "required",
    icon: "🪝",
  },
  {
    id: "codeowners",
    title: "Code ownership",
    shortTitle: "CODEOWNERS",
    description: "Map path globs to GitHub handles/teams so review requests route correctly.",
    kind: "file-form",
    group: "required",
    icon: "👥",
  },
  {
    id: "pre-commit-config",
    title: "Pre-commit config globs",
    shortTitle: "Hook globs",
    description: "Point the pre-commit hooks at your real directory names.",
    kind: "file-form",
    group: "required",
    icon: "🎯",
  },
  {
    id: "ci-workflow",
    title: "CI workflow",
    shortTitle: "CI workflow",
    description: "Wire up real lint/test commands in .github/workflows/ci.yml.",
    kind: "file-form",
    group: "required",
    icon: "⚙️",
  },
  {
    id: "sensor-table",
    title: "Sensor Dispatch Table",
    shortTitle: "Sensors",
    description: "Map file patterns to the sensor commands agents should run after an edit.",
    kind: "file-form",
    group: "required",
    icon: "📡",
  },
  {
    id: "vscode-workspace",
    title: "VS Code workspace",
    shortTitle: "Workspace",
    description: "Generate ai-workspace.code-workspace and toggle worker-group visibility.",
    kind: "workspace",
    group: "required",
    icon: "🗂️",
  },
  {
    id: "talisman",
    title: "Secret scanning",
    shortTitle: "Talisman",
    description: "Generate .talismanrc checksum entries for your real files.",
    kind: "run",
    group: "optional",
    icon: "🔒",
  },
  {
    id: "jira",
    title: "Jira integration",
    shortTitle: "Jira",
    description: "Board ID, project key, base URL, and API token for jira_client/.",
    kind: "file-form",
    group: "optional",
    icon: "🎫",
    showWhen: (p) => !!p?.usesJira,
  },
  {
    id: "dev-profile",
    title: "Dev profile & .env",
    shortTitle: "Dev profile",
    description: "Apply a local dev profile and set your DEV_EMAIL.",
    kind: "profile",
    group: "optional",
    icon: "🧑‍💻",
  },
  {
    id: "aws-auth",
    title: "AWS auth",
    shortTitle: "AWS auth",
    description: "Guided Okta/AWS CLI login, plus a non-interactive verify step.",
    kind: "aws",
    group: "optional",
    icon: "☁️",
    showWhen: (p) => !!p?.usesOktaAws,
  },
];

export function getStepDef(id: string): StepDef | undefined {
  return STEP_DEFS.find((s) => s.id === id);
}

/** Steps in display/flow order, filtered to what actually applies to this profile. A step with
 * no `showWhen` is always visible; before the profile is known, everything is shown so the
 * questionnaire itself is reachable. */
export function getVisibleSteps(profile: Record<string, boolean> | null): StepDef[] {
  return STEP_DEFS.filter((s) => !s.showWhen || !profile || s.showWhen(profile));
}

/** Previous/next step id in the guided flow, respecting profile-based visibility — this is what
 * powers the Back/Continue footer on each step page. */
export function getAdjacentStepIds(
  currentId: string,
  profile: Record<string, boolean> | null,
): { prev: StepDef | null; next: StepDef | null } {
  const visible = getVisibleSteps(profile);
  const idx = visible.findIndex((s) => s.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  return { prev: visible[idx - 1] ?? null, next: visible[idx + 1] ?? null };
}
