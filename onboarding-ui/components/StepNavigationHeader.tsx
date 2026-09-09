import Link from "next/link";
import { getVisibleSteps } from "@/lib/stepDefs";
import { StatusBadge } from "@/components/StatusBadge";
import type { StepStatus, StepStatusEntry } from "@/types";

export function StepNavigationHeader({
  currentStepId,
  profile,
  statuses,
}: {
  currentStepId: string;
  profile: Record<string, boolean> | null;
  statuses: Record<string, StepStatusEntry>;
}) {
  const visible = getVisibleSteps(profile);
  const currentIndex = visible.findIndex((s) => s.id === currentStepId);
  const currentStep = visible[currentIndex];

  if (!currentStep) return null;

  return (
    <div className="bg-[var(--bg)] border-b border-[var(--border-soft)] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Horizontal step navigation */}
        <div className="flex items-center overflow-x-auto">
          {visible.map((step, index) => {
            const status = statuses[step.id]?.status ?? ("not-started" as StepStatus);
            const isActive = step.id === currentStepId;
            const isLocked = status === "locked";
            const isDone = status === "done";

            return (
              <Link
                key={step.id}
                href={isLocked ? "#" : `/steps/${step.id}`}
                aria-disabled={isLocked}
                className={`flex-shrink-0 px-3 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                  isActive
                    ? "border-[var(--accent)] border-opacity-100"
                    : "border-transparent hover:border-[var(--border)]"
                } ${isLocked ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer"}`}
                style={{
                  color: isActive ? "var(--text)" : "var(--muted)",
                }}
              >
                {/* Step icon and title */}
                <span className="text-lg leading-none flex-shrink-0">{step.icon}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="mono text-xs text-[var(--muted-soft)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold truncate">{step.shortTitle}</span>
                  </div>
                  {/* Status indicator */}
                  <div className="flex-shrink-0 ml-1">
                    <StatusBadge status={status} />
                  </div>
                </div>

                {/* Separator dots between steps */}
                {index < visible.length - 1 && (
                  <span className="flex-shrink-0 mx-1 text-[var(--border)]">·</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
