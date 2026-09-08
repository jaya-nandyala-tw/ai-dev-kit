"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleSteps, type StepDef } from "@/lib/stepDefs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { restartOnboarding } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import type { ProfileAnswers, StepStatus, StepStatusEntry } from "@/types";

export function Stepper({
  statuses,
  profile,
}: {
  statuses: Record<string, StepStatusEntry>;
  profile: ProfileAnswers | null;
}) {
  const pathname = usePathname();
  const [restartOpen, setRestartOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const visible = getVisibleSteps(profile as unknown as Record<string, boolean> | null);
  const required = visible.filter((s) => s.group === "required");
  const optional = visible.filter((s) => s.group === "optional");
  const doneCount = required.filter((s) => statuses[s.id]?.status === "done").length;

  async function restart() {
    setRestarting(true);
    await restartOnboarding();
    toast.success("Onboarding restarted — your files are untouched.");
    // Full reload rather than a client-side nav: guarantees every panel re-fetches fresh state.
    window.location.href = "/";
  }

  return (
    <nav className="panel p-4 sticky top-4">
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-medium">Your progress</span>
          <span className="text-xs text-[var(--muted)] mono">
            {doneCount}/{required.length}
          </span>
        </div>
        <ProgressBar value={required.length ? (doneCount / required.length) * 100 : 0} />
      </div>

      <Timeline title="Setup" steps={required} statuses={statuses} pathname={pathname} />
      {optional.length > 0 && (
        <Timeline title="Optional for your stack" steps={optional} statuses={statuses} pathname={pathname} />
      )}

      <Link
        href="/recommendations"
        className={`card-interactive flex items-center gap-2 mt-2 px-3 py-2.5 rounded-[10px] text-sm border ${
          pathname === "/recommendations" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-soft)]"
        }`}
      >
        <span>🧹</span>
        <span>Recommended Resources</span>
      </Link>

      <button
        onClick={() => setRestartOpen(true)}
        className="w-full flex items-center gap-2 mt-1 px-3 py-2 rounded-[10px] text-sm text-[var(--muted-soft)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
      >
        <span>↺</span>
        <span>Restart onboarding</span>
      </button>

      <ConfirmDialog
        open={restartOpen}
        title="Restart onboarding?"
        body={
          <>
            This clears your stack-profile answers and this tool's own progress/run history, and
            takes you back to the welcome screen. It does <strong>not</strong> touch any file
            you've already written — CODEOWNERS, config/repos.json, .env, etc. all keep their
            content, and steps based on real file state will still show as done.
          </>
        }
        confirmLabel={restarting ? "Restarting…" : "Restart"}
        onConfirm={restart}
        onCancel={() => setRestartOpen(false)}
      />
    </nav>
  );
}

const NODE_STYLES: Record<StepStatus, { bg: string; border: string; color: string }> = {
  done: { bg: "var(--ok-soft)", border: "var(--ok)", color: "var(--ok)" },
  partial: { bg: "var(--warn-soft)", border: "var(--warn)", color: "var(--warn)" },
  "not-started": { bg: "transparent", border: "var(--border)", color: "var(--muted)" },
  locked: { bg: "transparent", border: "var(--border-soft)", color: "var(--muted-soft)" },
};

function Timeline({
  title,
  steps,
  statuses,
  pathname,
}: {
  title: string;
  steps: StepDef[];
  statuses: Record<string, StepStatusEntry>;
  pathname: string | null;
}) {
  return (
    <div className="mb-4">
      <div className="text-[0.68rem] uppercase tracking-wide text-[var(--muted-soft)] mb-2 px-1">{title}</div>
      <ul className="relative">
        {steps.map((s, i) => {
          const status = statuses[s.id]?.status ?? "not-started";
          const active = pathname === `/steps/${s.id}`;
          const locked = status === "locked";
          const isLast = i === steps.length - 1;
          const style = NODE_STYLES[status];

          return (
            <li key={s.id} className="relative flex gap-3">
              {!isLast && (
                <span
                  className="absolute left-[15px] top-8 bottom-0 w-px"
                  style={{ background: status === "done" ? "var(--ok)" : "var(--border)" }}
                />
              )}
              <Link
                href={locked ? "#" : `/steps/${s.id}`}
                aria-disabled={locked}
                className={`group flex items-start gap-3 py-1.5 flex-1 rounded-lg ${locked ? "opacity-55 pointer-events-none" : ""}`}
                title={locked ? s.title + " — " + (statuses[s.id]?.lockedReason ?? "locked") : s.title}
              >
                <span
                  className="relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all"
                  style={{
                    background: active ? "var(--accent-soft)" : style.bg,
                    borderColor: active ? "var(--accent)" : style.border,
                    color: active ? "var(--accent-strong)" : style.color,
                    boxShadow: active ? "0 0 0 3px var(--accent-soft)" : "none",
                  }}
                >
                  {status === "done" ? "✓" : locked ? "🔒" : s.icon}
                </span>
                <span className="pt-1.5 min-w-0">
                  <span
                    className={`text-sm block truncate transition-colors ${
                      active ? "text-[var(--text)] font-medium" : "text-[var(--muted)] group-hover:text-[var(--text)]"
                    }`}
                  >
                    {s.shortTitle}
                  </span>
                  {status === "partial" && <span className="text-[0.68rem] text-[var(--warn)]">in progress</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
