"use client";

import { useState } from "react";
import { startRun as apiStartRun } from "@/lib/apiClient";
import { TerminalPane } from "@/components/TerminalPane";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  { name: "copilot", icon: "✨" },
];

export function PrerequisitesStep({ status, onInstalled }: { status: StepStatusEntry | undefined; onInstalled?: () => void }) {
  const missing = new Set(
    (status?.detail?.startsWith("Missing:") ? status.detail.replace("Missing:", "") : "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const checking = !status;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  async function installCopilot() {
    setStarting(true);
    const res = await apiStartRun("copilot-install", []);
    setStarting(false);
    setConfirmOpen(false);
    if (res.runId) setRunId(res.runId);
  }

  return (
    <div className="panel-flat p-4">
      <p className="text-sm text-[var(--muted)] mb-4">Read-only check of what's on your PATH — no files are written.</p>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => {
          const isMissing = missing.has(t.name);
          const ok = !checking && !isMissing;
          const color = checking ? "var(--border)" : ok ? "var(--ok)" : "var(--danger)";
          const isCopilot = t.name === "copilot";
          return (
            <div key={t.name} className="border flex items-center gap-2 px-3 py-2" style={{ borderColor: color }}>
              <span>{t.icon}</span>
              <span className="mono text-sm">{t.name}</span>
              <span style={{ color }}>{checking ? "···" : ok ? "✓" : "✕"}</span>
              {isCopilot && !checking && !ok && !runId && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mono text-xs underline underline-offset-2"
                  style={{ color: "var(--accent)" }}
                >
                  Install
                </button>
              )}
            </div>
          );
        })}
      </div>

      {runId && (
        <div className="mt-3 anim-fade-in-up">
          <TerminalPane
            runId={runId}
            onExit={(code) => {
              if (code === 0) onInstalled?.();
            }}
          />
        </div>
      )}

      {!checking && missing.size > 0 && (
        <p className="text-xs text-[var(--warn)] mt-3">
          Missing: {[...missing].join(", ")} — install these before relying on the steps that need them.
          {missing.has("copilot") && " copilot is optional — it only powers the ✨ Copilot suggestion buttons elsewhere in the wizard."}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Install GitHub Copilot CLI"
        body="Runs: npm install -g @github/copilot — the official standalone Copilot CLI. Nothing in this repo is touched."
        confirmLabel={starting ? "Starting…" : "Install"}
        onConfirm={installCopilot}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
