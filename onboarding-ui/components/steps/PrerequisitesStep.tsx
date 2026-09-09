"use client";

import { useState } from "react";
import { startRun as apiStartRun } from "@/lib/apiClient";
import { TerminalPane } from "@/components/TerminalPane";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FileFormStep } from "@/components/steps/FileFormStep";
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

const SETUP_GUIDES = {
  gh: {
    title: "Setup GitHub CLI",
    icon: "🐙",
    steps: [
      {
        number: "1",
        title: "Install GitHub CLI",
        command: "brew install gh",
      },
      {
        number: "2",
        title: "Authenticate with GitHub",
        command: "gh auth login",
        details: "When prompted: Select SSH protocol, upload SSH key, use web browser for auth",
      },
      {
        number: "3",
        title: "Verify authentication",
        command: "gh auth status",
        details: "Should display: ✓ Logged in to github.com as <your-username>",
      },
    ],
  },
  atlassian: {
    title: "Setup Atlassian API Key",
    icon: "🎫",
    steps: [
      {
        number: "1",
        title: "Generate an Atlassian API token",
        details: "Go to: https://id.atlassian.com/manage-profile/security/api-tokens\nClick 'Create API token'\nCopy the token (save it securely)",
      },
      {
        number: "2",
        title: "Add credentials below",
        details: "Fill in your email, Jira base URL, and API token in the form below",
      },
      {
        number: "3",
        title: "Save to .env",
        details: "Click 'Preview' then 'Write' to save your credentials",
      },
    ],
  },
};

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
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  async function installCopilot() {
    setStarting(true);
    const res = await apiStartRun("copilot-install", []);
    setStarting(false);
    setConfirmOpen(false);
    if (res.runId) setRunId(res.runId);
  }

  const isMissingGh = missing.has("gh");
  const shouldShowGhGuide = !checking && isMissingGh;
  const shouldShowAtlassianGuide = !checking;

  return (
    <div className="space-y-4">
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

      {/* GitHub CLI Setup Guide */}
      {shouldShowGhGuide && (
        <div className="panel-flat p-4 border-l-4 border-[var(--accent)]">
          <button
            onClick={() => setExpandedGuide(expandedGuide === "gh" ? null : "gh")}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{SETUP_GUIDES.gh.icon}</span>
              <div className="text-left">
                <p className="font-semibold text-sm">{SETUP_GUIDES.gh.title}</p>
                <p className="text-xs text-[var(--muted)]">Required for ./scripts/clone-repos.sh --select</p>
              </div>
            </div>
            <span className="text-lg">{expandedGuide === "gh" ? "−" : "+"}</span>
          </button>

          {expandedGuide === "gh" && (
            <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border-soft)]">
              {SETUP_GUIDES.gh.steps.map((step) => (
                <div key={step.number} className="space-y-2">
                  <div className="flex gap-3">
                    <span
                      className="text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent)", color: "var(--bg)" }}
                    >
                      {step.number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      {step.command && (
                        <code
                          className="block text-xs mono mt-2 p-2 rounded"
                          style={{ background: "var(--border-soft)" }}
                        >
                          {step.command}
                        </code>
                      )}
                      {step.details && (
                        <p className="text-xs text-[var(--muted)] mt-2 whitespace-pre-line">{step.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Atlassian API Key Setup Guide */}
      {shouldShowAtlassianGuide && (
        <div className="panel-flat p-4 border-l-4 border-[var(--accent)]">
          <button
            onClick={() => setExpandedGuide(expandedGuide === "atlassian" ? null : "atlassian")}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{SETUP_GUIDES.atlassian.icon}</span>
              <div className="text-left">
                <p className="font-semibold text-sm">{SETUP_GUIDES.atlassian.title}</p>
                <p className="text-xs text-[var(--muted)]">Optional — only if your team uses Jira/Confluence</p>
              </div>
            </div>
            <span className="text-lg">{expandedGuide === "atlassian" ? "−" : "+"}</span>
          </button>

          {expandedGuide === "atlassian" && (
            <div className="mt-4 space-y-4 pt-4 border-t border-[var(--border-soft)]">
              {SETUP_GUIDES.atlassian.steps.map((step) => (
                <div key={step.number} className="space-y-2">
                  <div className="flex gap-3">
                    <span
                      className="text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent)", color: "var(--bg)" }}
                    >
                      {step.number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      {step.details && (
                        <p className="text-xs text-[var(--muted)] mt-2 whitespace-pre-line">{step.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Atlassian Credentials Form — using existing FileFormStep */}
              <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
                <FileFormStep
                  fileKey="env"
                  stepId="prerequisites"
                  onWritten={onInstalled || (() => {})}
                  fieldFilter={["DEV_EMAIL", "JIRA_BASE_URL", "JIRA_API_TOKEN"]}
                  extraFieldsNote="These credentials enable Jira and Confluence access for ticket intake and context."
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
