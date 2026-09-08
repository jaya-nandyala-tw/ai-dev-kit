"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getVisibleSteps } from "@/lib/stepDefs";

const HIGHLIGHTS = [
  { icon: "🧭", text: "A few questions tailor the whole flow to your stack" },
  { icon: "👀", text: "Every change shows a diff before it touches a real file" },
  { icon: "⚡", text: "One-click actions run the real scripts, streamed live" },
];

export default function HomePage() {
  return (
    <DashboardShell>
      {({ profile, statuses }) => {
        const visible = getVisibleSteps(profile as unknown as Record<string, boolean> | null);
        const required = visible.filter((s) => s.group === "required");
        const doneCount = required.filter((s) => statuses[s.id]?.status === "done").length;
        const nextStep = visible.find((s) => statuses[s.id]?.status !== "done" && statuses[s.id]?.status !== "locked");
        const allRequiredDone = profile && required.every((s) => statuses[s.id]?.status === "done");

        return (
          <div className="space-y-5 anim-fade-in-up">
            <div className="panel p-6 sm:p-8 relative overflow-hidden">
              <div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
              />
              <p className="text-xs uppercase tracking-wide text-[var(--muted-soft)] mb-2">Guided Setup</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mb-2 tracking-tight">
                Welcome to the AI Starter Kit 👋
              </h1>
              <p className="text-sm text-[var(--muted)] max-w-2xl mb-5">
                This dashboard replaces reading ONBOARDING.md top to bottom with a short, guided
                path. Nothing here is simulated — it reads and writes the real files in this repo
                and can run the real setup scripts for you, one clear step at a time.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {HIGHLIGHTS.map((h) => (
                  <div key={h.text} className="panel-flat px-3 py-2 text-xs flex items-center gap-2 text-[var(--muted)]">
                    <span>{h.icon}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>

              {!profile ? (
                <Link href="/steps/stack-profile">
                  <Button variant="primary" icon={<span>🧭</span>}>
                    Start the guided setup
                  </Button>
                </Link>
              ) : nextStep ? (
                <div className="max-w-sm">
                  <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
                    <span>Required steps</span>
                    <span className="mono">
                      {doneCount}/{required.length}
                    </span>
                  </div>
                  <ProgressBar value={required.length ? (doneCount / required.length) * 100 : 0} className="mb-4" />
                  <Link href={`/steps/${nextStep.id}`}>
                    <Button variant="primary" icon={<span>{nextStep.icon}</span>}>
                      Continue: {nextStep.title}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ok)" }}>
                  <span className="anim-pop">🎉</span>
                  <span>All required steps are done.</span>
                </div>
              )}
            </div>

            {allRequiredDone && (
              <Link href="/recommendations" className="block">
                <div className="panel-flat card-interactive p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5">🧹 Trim what you don't need</p>
                    <p className="text-xs text-[var(--muted)]">
                      See which agents/skills/scripts don't apply to your stack.
                    </p>
                  </div>
                  <span className="text-[var(--muted)]">→</span>
                </div>
              </Link>
            )}
          </div>
        );
      }}
    </DashboardShell>
  );
}
