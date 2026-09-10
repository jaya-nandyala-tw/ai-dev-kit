// Shared types for the onboarding wizard. Kept in one file since the whole app is small.

export type ProfileAnswers = {
  hasWorkers: boolean;
  hasIac: boolean;
  usesJira: boolean;
  buildsFrontend: boolean;
  buildsAiSolutions: boolean;
  buildsDataPipelines: boolean;
  usesDocker: boolean;
  usesKubernetes: boolean;
  usesDatabases: boolean;
};

export type ProfileQuestionKey = keyof ProfileAnswers;

export type StepStatus = "not-started" | "partial" | "done" | "locked";

export type StepStatusEntry = {
  id: string;
  status: StepStatus;
  detail?: string;
  lockedReason?: string;
};

export type RunLogEntry = {
  runId: string;
  script: string;
  args: string[];
  startedAt: string;
  endedAt?: string;
  exitCode?: number | null;
};

export type OnboardingState = {
  version: 1;
  updatedAt: string;
  profile: ProfileAnswers | null;
  stepMeta: Record<string, { completedAt?: string; method?: "wizard" | "manual" }>;
  runs: RunLogEntry[];
};

export type RecommendationVerdict = "always" | "relevant" | "not-needed";

export type RecommendationItem = {
  key: string;
  paths: string[];
  verdict: RecommendationVerdict;
  why: string;
  removable: boolean;
};

export type DiffResult = {
  key: string;
  path: string;
  baseline: string;
  current: string;
  proposed: string;
  currentExists: boolean;
  customized: boolean;
  unifiedDiff: string;
  currentHash: string;
};

export type FieldType = "text" | "textarea" | "table" | "checkbox";

export type TableColumn = {
  name: string;
  label: string;
  placeholder?: string;
  /** Column can be filled via a Copilot CLI suggestion (see GenericFileForm's "✨" affordance). */
  suggestable?: boolean;
};

export type FieldSchema = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  columns?: TableColumn[]; // for type: "table"
};

export type ManagedFileInfo = {
  key: string;
  relPath: string;
  fields: FieldSchema[];
  currentValues: Record<string, unknown>;
  exists: boolean;
};

// SSE event stream shape for a spawned run. Kept deliberately flat/simple (newline-delimited
// JSON) rather than a richer protocol — see architecture notes in the plan.
export type RunEvent =
  | { type: "stdout"; runId: string; data: string; ts: string }
  | { type: "stderr"; runId: string; data: string; ts: string }
  | { type: "prompt"; runId: string; prompt: string; ts: string }
  | { type: "exit"; runId: string; code: number | null; ts: string }
  | { type: "error"; runId: string; message: string; ts: string };

// ── Acquire / Review Context ────────────────────────────────────────────────
// A context "item" is a raw, user-pasted dump (meeting notes, a doc export, a runbook) stored as
// a real file under specs/context/<category>/ — this type/list is safe to import from both
// client code (apiClient.ts) and server code (lib/contextStore.ts) since it has no Node imports.

export type ContextCategory = "business-workflow" | "tech-guideline" | "domain-glossary" | "team-convention" | "uncategorized";

export const CONTEXT_CATEGORIES: { value: ContextCategory; label: string }[] = [
  { value: "business-workflow", label: "Business workflow" },
  { value: "tech-guideline", label: "Tech / architecture guideline" },
  { value: "domain-glossary", label: "Domain glossary" },
  { value: "team-convention", label: "Team convention" },
  { value: "uncategorized", label: "Uncategorized" },
];

// How a context item's raw content was originally acquired — recorded in the item's frontmatter
// and surfaced in the UI, but never changes how it's stored or drafted from.
export type ContextSource = "pasted" | "pdf" | "confluence";

export type ContextItem = {
  slug: string;
  title: string;
  category: ContextCategory;
  summary: string;
  createdAt: string;
  relPath: string;
  hasDraft: boolean;
  source: ContextSource;
  sourceUrl?: string;
};

// A single Confluence page as returned by atlassian_client's confluence_cli (search or get) —
// shared between the client and the API routes that shell out to that CLI.
export type ConfluencePageResult = {
  id: string;
  title: string;
  spaceKey: string;
  url: string;
  version: number | null;
  excerpt: string | null;
  body: string | null;
};

// ── Aggregated spec generation (multi-source "Generate spec") ──────────────
// One combined-spec generation run turns N ContextItems (all in the same category) into a small
// set of Markdown files under specs/drafts/<baseSlug>/ — an index.md plus optional sub-flow
// files, per the "progressive disclosure" principle in harness-engineering.md. Each proposed file
// is previewed as a DiffResult (same three-way-diff machinery as managedFiles.ts) before write.
export type SpecFilePreview = {
  /** Relative to specs/drafts/<baseSlug>/ — e.g. "index.md" or "password-reset-flow.md". */
  relPath: string;
  title: string;
  diff: DiffResult;
};
