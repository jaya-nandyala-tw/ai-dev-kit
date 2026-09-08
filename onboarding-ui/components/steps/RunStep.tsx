"use client";

import { useState } from "react";
import { startRun as apiStartRun, markStepDone } from "@/lib/apiClient";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TerminalPane } from "@/components/TerminalPane";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export function RunStep({
  scriptKey,
  args = [],
  stepId,
  label,
  confirmBody,
  danger,
  successMessage,
  onDone,
}: {
  scriptKey: string;
  args?: string[];
  stepId: string;
  label: string;
  confirmBody: React.ReactNode;
  danger?: boolean;
  successMessage?: string;
  onDone: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setStarting(true);
    setError(null);
    const res = await apiStartRun(scriptKey, args);
    setStarting(false);
    setConfirmOpen(false);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    setRunId(res.runId ?? null);
  }

  return (
    <div className="space-y-3">
      {!runId && (
        <Button variant={danger ? "danger" : "primary"} onClick={() => setConfirmOpen(true)}>
          {label}
        </Button>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {runId && (
        <TerminalPane
          runId={runId}
          onExit={(code) => {
            if (code === 0) {
              markStepDone(stepId).then(onDone);
              toast.success(successMessage ?? `${label} — done`);
            } else {
              toast.error(`${label} exited with code ${code}`);
            }
          }}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={label}
        body={confirmBody}
        confirmLabel={starting ? "Starting…" : "Run"}
        danger={danger}
        onConfirm={run}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
