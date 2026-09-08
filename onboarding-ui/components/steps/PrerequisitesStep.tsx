import type { StepStatusEntry } from "@/types";

// Kept in sync by hand with lib/detectors.ts's `tools` list — that's the actual check; this is
// only the display. (Previously drifted: this list still showed docker/aws after the detector
// stopped checking them, which would have silently rendered a false "✅ installed" for both.)
const TOOLS = [
  { name: "git", icon: "🔀" },
  { name: "node", icon: "🟢" },
  { name: "python3", icon: "🐍" },
  { name: "gh", icon: "🐙" },
  { name: "pre-commit", icon: "🪝" },
];

export function PrerequisitesStep({ status }: { status: StepStatusEntry | undefined }) {
  const missing = new Set(
    (status?.detail?.startsWith("Missing:") ? status.detail.replace("Missing:", "") : "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const checking = !status;

  return (
    <div className="panel-flat p-4">
      <p className="text-sm text-[var(--muted)] mb-4">Read-only check of what's on your PATH — no files are written.</p>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => {
          const isMissing = missing.has(t.name);
          const ok = !checking && !isMissing;
          const color = checking ? "var(--border)" : ok ? "var(--ok)" : "var(--danger)";
          return (
            <div key={t.name} className="border flex items-center gap-2 px-3 py-2" style={{ borderColor: color }}>
              <span>{t.icon}</span>
              <span className="mono text-sm">{t.name}</span>
              <span style={{ color }}>{checking ? "···" : ok ? "✓" : "✕"}</span>
            </div>
          );
        })}
      </div>
      {!checking && missing.size > 0 && (
        <p className="text-xs text-[var(--warn)] mt-3">
          Missing: {[...missing].join(", ")} — install these before relying on the steps that need them.
        </p>
      )}
    </div>
  );
}
