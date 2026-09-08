"use client";

import { useState } from "react";
import { generateWorkspace } from "@/lib/apiClient";
import { RunStep } from "@/components/steps/RunStep";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export function WorkspaceStep({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [group, setGroup] = useState("");

  async function generate() {
    setError(null);
    setGenerating(true);
    const res = await generateWorkspace();
    setGenerating(false);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    setGenerated(true);
    toast.success("ai-workspace.code-workspace generated");
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="panel-flat p-4 space-y-2.5 anim-fade-in-up">
        <p className="text-sm">
          <code className="mono text-xs">ai-workspace.code-workspace</code> doesn't ship with this kit — generate it
          from <code className="mono text-xs">config/repos.json</code> first.
        </p>
        <Button variant="primary" onClick={generate} loading={generating}>
          Generate workspace file
        </Button>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {generated && (
          <p className="text-sm anim-fade-in-up" style={{ color: "var(--ok)" }}>
            ✓ Generated. Open it with: <code className="mono text-xs">code ai-workspace.code-workspace</code>
          </p>
        )}
      </div>

      <div className="panel-flat p-4 space-y-3">
        <p className="text-sm font-medium">Toggle worker visibility</p>
        <div className="flex flex-wrap gap-2">
          <RunStep
            scriptKey="workspace"
            args={["core"]}
            stepId="vscode-workspace"
            label="Core only"
            confirmBody="Hides all worker folders in the workspace."
            onDone={onDone}
          />
          <RunStep
            scriptKey="workspace"
            args={["reset"]}
            stepId="vscode-workspace"
            label="Show all"
            confirmBody="Shows every folder in the workspace."
            onDone={onDone}
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="group name from config/repos.json"
            className="field-input flex-1"
          />
          {group && (
            <RunStep
              scriptKey="workspace"
              args={["group", group]}
              stepId="vscode-workspace"
              label={`Show "${group}"`}
              confirmBody={`Shows only the "${group}" worker group in the workspace.`}
              onDone={onDone}
            />
          )}
        </div>
      </div>
    </div>
  );
}
