"use client";

import { FileFormStep } from "@/components/steps/FileFormStep";

export function JiraStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-4">
      <div className="panel-flat p-4">
        <p className="flex items-center gap-2 mb-3">
          <span>🔑</span>
          <span className="text-sm font-semibold">Credentials</span>
          <span className="mono text-xs text-[var(--muted-soft)]">.env</span>
        </p>
        <FileFormStep
          fileKey="env"
          stepId="jira"
          onWritten={onDone}
          fieldFilter={["DEV_EMAIL", "JIRA_BASE_URL", "JIRA_API_TOKEN"]}
        />
      </div>
      <div className="panel-flat p-4">
        <p className="flex items-center gap-2 mb-3">
          <span>🎫</span>
          <span className="text-sm font-semibold">Board</span>
          <span className="mono text-xs text-[var(--muted-soft)]">jira_client/fetch_*.py</span>
        </p>
        <FileFormStep fileKey="jira-board" stepId="jira" onWritten={onDone} />
      </div>
    </div>
  );
}
