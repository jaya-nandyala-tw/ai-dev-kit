"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getAdjacentStepIds, getStepDef, getVisibleSteps } from "@/lib/stepDefs";
import { StatusBadge } from "@/components/StatusBadge";
import { StepHelpButton } from "@/components/StepHelpButton";
import { Button } from "@/components/ui/Button";
import { PrerequisitesStep } from "@/components/steps/PrerequisitesStep";
import { QuestionnaireStep } from "@/components/steps/QuestionnaireStep";
import { ReposStep } from "@/components/steps/ReposStep";
import { RunStep } from "@/components/steps/RunStep";
import { FileFormStep } from "@/components/steps/FileFormStep";
import { JiraStep } from "@/components/steps/JiraStep";

const FILE_FORM_KEY_BY_STEP: Record<string, string> = {
  codeowners: "codeowners",
  "pre-commit-config": "pre-commit-config",
  "ci-workflow": "ci-workflow",
  "sensor-table": "global-instructions",
};

export default function StepPage() {
  const params = useParams<{ stepId: string }>();
  const stepId = params.stepId;
  const def = getStepDef(stepId);

  return (
    <DashboardShell>
      {({ profile, statuses, refresh }) => {
        if (!def) return <p className="text-[var(--danger)]">Unknown step.</p>;

        const visible = getVisibleSteps(profile as unknown as Record<string, boolean> | null);
        const position = visible.findIndex((s) => s.id === stepId) + 1;
        const { prev, next } = getAdjacentStepIds(stepId, profile as unknown as Record<string, boolean> | null);
        const status = statuses[stepId]?.status ?? "not-started";

        return (
          <div key={stepId} className="anim-fade-in-up space-y-5">
            <div className="panel-flat p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wide text-[var(--muted-soft)]">
                  Step {position} of {visible.length} · {def.group === "required" ? "Required" : "Optional"}
                </p>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{def.icon}</span>
                  <h1 className="text-lg font-semibold">{def.title}</h1>
                </div>
                <StepHelpButton stepId={stepId} title={def.title} icon={def.icon} />
              </div>
              <p className="text-sm text-[var(--muted)] mt-1">{def.description}</p>
            </div>

            <div>
              {def.kind === "prerequisites" && <PrerequisitesStep status={statuses[stepId]} />}

              {def.kind === "questionnaire" && <QuestionnaireStep initial={profile} onSaved={refresh} />}

              {def.kind === "repos" && <ReposStep onWritten={refresh} />}

              {def.kind === "run" && stepId === "pre-commit-hooks" && (
                <RunStep
                  scriptKey="pre-commit-install"
                  stepId="pre-commit-hooks"
                  label="Install pre-commit + hook"
                  confirmBody="Runs: pip3 install pre-commit && pre-commit install"
                  onDone={refresh}
                />
              )}

              {def.kind === "run" && stepId === "talisman" && (
                <RunStep
                  scriptKey="talisman-init"
                  stepId="talisman"
                  label="Generate .talismanrc checksums"
                  confirmBody="Runs: talisman -i (interactively detects staged changes and appends checksum entries)."
                  onDone={refresh}
                />
              )}

              {def.kind === "file-form" && stepId !== "jira" && FILE_FORM_KEY_BY_STEP[stepId] && (
                <FileFormStep fileKey={FILE_FORM_KEY_BY_STEP[stepId]} stepId={stepId} onWritten={refresh} />
              )}

              {stepId === "jira" && <JiraStep onDone={refresh} />}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
              {prev ? (
                <Link href={`/steps/${prev.id}`}>
                  <Button variant="ghost" icon={<span>←</span>}>
                    {prev.shortTitle}
                  </Button>
                </Link>
              ) : (
                <Link href="/">
                  <Button variant="ghost" icon={<span>←</span>}>
                    Home
                  </Button>
                </Link>
              )}
              {next ? (
                <Link href={`/steps/${next.id}`}>
                  <Button variant="primary">
                    Continue: {next.shortTitle} →
                  </Button>
                </Link>
              ) : (
                <Link href="/recommendations">
                  <Button variant="primary" icon={<span>🧹</span>}>
                    Review recommended resources
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );
      }}
    </DashboardShell>
  );
}
