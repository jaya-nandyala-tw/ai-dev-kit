"use client";

import Link from "next/link";
import { getVisibleSteps } from "@/lib/stepDefs";
import type { ProfileAnswers, StepStatusEntry } from "@/types";

// Replaces the old persistent sidebar's progress bar — a slim segmented accent rail, one
// segment per required step, plus a link back to the homepage's Roadmap section for jumping to
// any step out of sequence (Back/Continue below handle the sequential case). Purely indicative,
// not clickable per-segment: a 4px-tall bar is well under a real touch target, so "jump to a
// step" lives in the one link instead of pretending each sliver is tappable.
export function ProgressRail({
  currentStepId,
  profile,
  statuses,
}: {
  currentStepId: string;
  profile: ProfileAnswers | null;
  statuses: Record<string, StepStatusEntry>;
}) {
  const required = getVisibleSteps(profile as unknown as Record<string, boolean> | null).filter(
    (s) => s.group === "required",
  );
  const doneCount = required.filter((s) => statuses[s.id]?.status === "done").length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="mono text-xs tracking-wide text-[var(--muted-soft)]">
          {doneCount}/{required.length} required steps
        </span>
        <Link href="/#roadmap" className="mono text-xs tracking-wide text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
          View all steps ↗
        </Link>
      </div>
      <div className="flex gap-1">
        {required.map((s) => {
          const status = statuses[s.id]?.status ?? "not-started";
          const isCurrent = s.id === currentStepId;
          const color = isCurrent ? "var(--accent)" : status === "done" ? "var(--ok)" : "var(--border)";
          return <span key={s.id} className="h-1 flex-1 transition-colors" style={{ background: color }} title={s.title} />;
        })}
      </div>
    </div>
  );
}
