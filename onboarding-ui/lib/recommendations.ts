import fs from "node:fs";
import { repoPath } from "./paths";
import type { ProfileAnswers, RecommendationItem, RecommendationVerdict } from "@/types";

type Rule = {
  key: string;
  paths: string[];
  removable: boolean;
  relevant: (p: ProfileAnswers, hasWorkerRepos: boolean) => boolean;
  why: string;
};

// One row per resource this kit ships. `relevant` returning false is what earns a "not-needed"
// badge; `always` items skip the profile check entirely. Kept as a flat static table (not
// computed from README prose) so it's easy to audit and to extend as the kit grows.
const RULES: Rule[] = [
  {
    key: "agents",
    paths: [".github/agents"],
    removable: false,
    relevant: () => true,
    why: "Generic story-lifecycle agents (@ask, @story, @groom, @implement, @git, @test, @verify, @orchestrator, @doc-garden) — stack-agnostic.",
  },
  {
    key: "skills",
    paths: [".github/skills"],
    removable: false,
    relevant: () => true,
    why: "Reusable multi-step workflows invoked by the agents above — stack-agnostic.",
  },
  {
    key: "prompts",
    paths: [".github/prompts"],
    removable: false,
    relevant: () => true,
    why: "One-shot prompt templates (blast-radius, change-spec, trace-flow) — generic to any codebase.",
  },
  {
    key: "plugins-jira",
    paths: [".github/plugins/jira"],
    removable: true,
    relevant: (p) => p.usesJira,
    why: "Jira-specific workflow packaging — no use if your team doesn't track tickets in Jira.",
  },
  {
    key: "plugins-other",
    paths: [
      ".github/plugins/address-pr-comments",
      ".github/plugins/code-review",
      ".github/plugins/doc-garden",
      ".github/plugins/git",
      ".github/plugins/grill-me",
      ".github/plugins/handoff",
      ".github/plugins/plan-story",
      ".github/plugins/pr-manager",
      ".github/plugins/pull-request-gen",
    ],
    removable: false,
    relevant: () => true,
    why: "Generic PR/review/handoff workflows — stack-agnostic.",
  },
  {
    key: "instructions-iac",
    paths: [".github/instructions/iac.instructions.md"],
    removable: true,
    relevant: (p) => p.hasIac,
    why: "Terraform/IaC-only conventions — no use without a dedicated infrastructure-as-code repo.",
  },
  {
    key: "instructions-lambdas",
    paths: [".github/instructions/lambdas.instructions.md"],
    removable: true,
    relevant: (p) => p.hasWorkers,
    why: "Worker/lambda-only conventions — no use without worker/lambda functions.",
  },
  {
    key: "jira-client",
    paths: ["jira_client"],
    removable: true,
    relevant: (p) => p.usesJira,
    why: "Jira Cloud API client + CLI — no use if your team doesn't track tickets in Jira.",
  },
  {
    key: "aws-auth-scripts",
    paths: ["scripts/aws-auth.sh", "scripts/aws-role-picker.py"],
    removable: true,
    relevant: (p) => p.usesOktaAws,
    why: "Needed for any Okta-authenticated `aws` CLI use — deploys, migrations, POC work, log tailing — not only standing deployment pipelines.",
  },
  {
    key: "mock-idp",
    paths: ["scripts/mock-idp.py"],
    removable: true,
    relevant: (p) => p.hasBackend,
    why: "Local auth mocking for backend/API development — no use for a pure frontend or IaC-only team.",
  },
  {
    key: "lambda-debug-tools",
    paths: ["scripts/invoke-lambda.sh", "scripts/debug_lambda.py"],
    removable: true,
    relevant: (p) => p.hasWorkers,
    why: "Lambda-only local debug/invoke tooling — no use without worker/lambda functions. (Their --remote/--real-aws modes additionally need Okta AWS access.)",
  },
  {
    key: "workspace-groups",
    paths: ["scripts/workspace.py", "scripts/workspace.sh"],
    removable: false,
    relevant: (_p, hasWorkerRepos) => hasWorkerRepos,
    why: "Worker-group visibility toggle for the VS Code workspace — has nothing to toggle without any tier:\"worker\" repos selected.",
  },
];

const PROFILE_FILES: Array<{ file: string; relevant: (p: ProfileAnswers) => boolean; why: string }> = [
  { file: "profiles/frontend.env", relevant: (p) => p.hasFrontend, why: "Frontend-only profile." },
  { file: "profiles/backend.env", relevant: (p) => p.hasBackend, why: "Backend-only profile." },
  { file: "profiles/fullstack.env", relevant: (p) => p.hasFrontend && p.hasBackend, why: "Full local stack." },
  {
    file: "profiles/fullstack-docker.env",
    relevant: (p) => p.hasFrontend && p.hasBackend && p.usesDockerCompose,
    why: "Full local stack with the service containerized via Docker Compose.",
  },
  { file: "profiles/lambda.env", relevant: (p) => p.hasWorkers, why: "Worker/lambda-only profile." },
  { file: "profiles/integration.env", relevant: (p) => p.usesOktaAws, why: "Points at real deployed AWS services." },
  { file: "profiles/aws-login.env", relevant: (p) => p.usesOktaAws, why: "Runs only the AWS/Okta login flow." },
];

function hasAnyWorkerRepo(): boolean {
  try {
    const raw = fs.readFileSync(repoPath("config/repos.json"), "utf8");
    const doc = JSON.parse(raw) as { repos?: Array<{ tier?: string }> };
    return (doc.repos ?? []).some((r) => r.tier === "worker");
  } catch {
    return false;
  }
}

export function computeRecommendations(profile: ProfileAnswers | null): RecommendationItem[] {
  const p = profile ?? {
    hasFrontend: true,
    hasBackend: true,
    hasWorkers: true,
    hasIac: true,
    usesJira: true,
    usesOktaAws: true,
    usesDockerCompose: true,
  };
  const hasWorkerRepos = hasAnyWorkerRepo();
  const profileKnown = profile !== null;

  const items: RecommendationItem[] = RULES.map((rule) => {
    const relevant = rule.relevant(p, hasWorkerRepos);
    const verdict: RecommendationVerdict = !rule.removable
      ? "always"
      : profileKnown && !relevant
        ? "not-needed"
        : "relevant";
    return { key: rule.key, paths: rule.paths, verdict, why: rule.why, removable: rule.removable };
  });

  for (const pf of PROFILE_FILES) {
    if (!fs.existsSync(repoPath(pf.file))) continue;
    const relevant = pf.relevant(p);
    const verdict: RecommendationVerdict = profileKnown && !relevant ? "not-needed" : "relevant";
    items.push({ key: `profile:${pf.file}`, paths: [pf.file], verdict, why: pf.why, removable: true });
  }

  return items;
}
