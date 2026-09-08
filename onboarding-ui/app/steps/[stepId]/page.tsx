"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WizardShell } from "@/components/WizardShell";
import { getAdjacentStepIds, getStepDef, getVisibleSteps } from "@/lib/stepDefs";
import { StatusBadge } from "@/components/StatusBadge";
import { StepHelpButton } from "@/components/StepHelpButton";
import { ProgressRail } from "@/components/ProgressRail";
import { Button } from "@/components/ui/Button";
import { PrerequisitesStep } from "@/components/steps/PrerequisitesStep";
import { QuestionnaireStep } from "@/components/steps/QuestionnaireStep";
import { ReposStep } from "@/components/steps/ReposStep";
import { RunStep } from "@/components/steps/RunStep";
import { FileFormStep } from "@/components/steps/FileFormStep";
import { JiraStep } from "@/components/steps/JiraStep";

const FILE_FORM_KEY_BY_STEP: Record<string, string> = {
  "pre-commit-config": "pre-commit-config",
  "sensor-table": "global-instructions",
};

// layout.tsx's outer container closes with `py-8` (2rem) below this page — subtracted here so
// the measured pane's bottom edge lands exactly on that padding instead of pushing the page
// another 2rem past the viewport and reintroducing outer scroll.
const OUTER_BOTTOM_PADDING_PX = 32;
const MIN_PANE_HEIGHT_PX = 360;

export default function StepPage() {
  const params = useParams<{ stepId: string }>();
  const stepId = params.stepId;
  const def = getStepDef(stepId);

  // Hooks live here, not inside WizardShell's render-prop below — that callback is skipped
  // entirely while WizardShell is still loading, which would make hook call order conditional.
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneHeight, setPaneHeight] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const el = paneRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setPaneHeight(Math.max(MIN_PANE_HEIGHT_PX, window.innerHeight - top - OUTER_BOTTOM_PADDING_PX));
    }
    measure();
    // A late webfont swap or content change can shift where the pane starts; both listeners are
    // cheap and just re-measure rather than trying to predict every layout-shifting cause.
    window.addEventListener("resize", measure);
    const raf = requestAnimationFrame(measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [stepId]);

  return (
    <WizardShell>
      {({ profile, statuses, refresh }) => {
        if (!def) return <p className="text-[var(--danger)]">Unknown step.</p>;

        const visible = getVisibleSteps(profile as unknown as Record<string, boolean> | null);
        const position = visible.findIndex((s) => s.id === stepId) + 1;
        const { prev, next } = getAdjacentStepIds(stepId, profile as unknown as Record<string, boolean> | null);
        const status = statuses[stepId]?.status ?? "not-started";

        return (
          <div
            key={stepId}
            ref={paneRef}
            className="anim-fade-in-up max-w-7xl mx-auto flex flex-col gap-5"
            style={{ height: paneHeight ? `${paneHeight}px` : undefined }}
          >
            {/* Header — progress rail + step info card. Never scrolls. */}
            <div className="shrink-0">
              <ProgressRail currentStepId={stepId} profile={profile} statuses={statuses} />

              <div className="panel-flat p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="label-micro">
                    Step {position} of {visible.length} · {def.group === "required" ? "Required" : "Optional"}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={status} />
                    <StepHelpButton stepId={stepId} title={def.title} icon={def.icon} />
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{def.icon}</span>
                  <h1 className="text-xl font-bold tracking-tight">{def.title}</h1>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1">{def.description}</p>
              </div>
            </div>

            {/* Content — the only part that scrolls. min-h-0 overrides flexbox's default
                min-height:auto, which would otherwise let this grow past the pane instead of
                scrolling internally. */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {def.kind === "prerequisites" && <PrerequisitesStep status={statuses[stepId]} onInstalled={refresh} />}

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

              {def.kind === "file-form" && stepId !== "jira" && FILE_FORM_KEY_BY_STEP[stepId] && (
                <FileFormStep fileKey={FILE_FORM_KEY_BY_STEP[stepId]} stepId={stepId} onWritten={refresh} />
              )}

              {stepId === "jira" && <JiraStep onDone={refresh} />}
            </div>

            {/* Footer — Back/Continue. Pinned to the bottom of the pane, never scrolls. */}
            <div className="shrink-0 flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
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
    </WizardShell>
  );
}
