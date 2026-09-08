import type { StepStatus } from "@/types";

const STYLES: Record<StepStatus, { label: string; color: string }> = {
  done: { label: "Done", color: "var(--ok)" },
  partial: { label: "Partial", color: "var(--warn)" },
  "not-started": { label: "Not started", color: "var(--muted)" },
  locked: { label: "Locked", color: "var(--muted)" },
};

export function StatusBadge({ status }: { status: StepStatus }) {
  const s = STYLES[status];
  return (
    <span className="badge" style={{ color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  );
}
