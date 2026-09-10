import type { ProfileAnswers, RecommendationItem, RecommendationVerdict } from "@/types";

type Rule = {
  key: string;
  paths: string[];
  removable: boolean;
  relevant: (p: ProfileAnswers) => boolean;
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
    why: "Generic story-lifecycle agents (@ask, @story, @intake, @implement, @git, @test, @verify, @orchestrator, @doc-sync) — stack-agnostic.",
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
    key: "atlassian-client",
    paths: ["atlassian_client"],
    removable: true,
    relevant: (p) => p.usesJira,
    why: "Jira + Confluence Cloud API client (shared Atlassian token) + CLI — no use if your team doesn't track tickets in Jira Cloud.",
  },
];

export function computeRecommendations(profile: ProfileAnswers | null): RecommendationItem[] {
  const p = profile ?? { 
    hasWorkers: true, 
    hasIac: true, 
    usesJira: true,
    buildsFrontend: true,
    buildsAiSolutions: true,
    buildsDataPipelines: true,
    usesDocker: true,
    usesKubernetes: false,
    usesDatabases: true,
  };
  const profileKnown = profile !== null;

  return RULES.map((rule) => {
    const relevant = rule.relevant(p);
    const verdict: RecommendationVerdict = !rule.removable
      ? "always"
      : profileKnown && !relevant
        ? "not-needed"
        : "relevant";
    return { key: rule.key, paths: rule.paths, verdict, why: rule.why, removable: rule.removable };
  });
}
