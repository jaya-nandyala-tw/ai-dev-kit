import type { StepStatusEntry } from "@/types";

const TOOLS = [
  { name: "git", icon: "🔀" },
  { name: "node", icon: "🟢" },
  { name: "python3", icon: "🐍" },
  { name: "docker", icon: "🐳" },
  { name: "aws", icon: "☁️" },
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TOOLS.map((t) => {
          const isMissing = missing.has(t.name);
          const ok = !checking && !isMissing;
          return (
            <div
              key={t.name}
              className="panel-flat p-2.5 flex items-center gap-2 text-sm"
              style={{ borderColor: checking ? "var(--border-soft)" : ok ? "var(--ok)" : "var(--danger)" }}
            >
              <span>{t.icon}</span>
              <span className="mono flex-1">{t.name}</span>
              <span>{checking ? "…" : ok ? "✅" : "❌"}</span>
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
