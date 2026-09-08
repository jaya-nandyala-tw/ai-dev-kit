"use client";

import { FileFormStep } from "@/components/steps/FileFormStep";

export function JiraStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <p className="text-sm mb-3 font-medium">Credentials (.env)</p>
        <FileFormStep fileKey="env" stepId="jira" onWritten={onDone} fieldFilter={["JIRA_BASE_URL", "JIRA_API_TOKEN"]} />
      </div>
      <div className="panel p-4">
        <p className="text-sm mb-3 font-medium">Board (jira_client/fetch_my_stories.py + fetch_sprint_stories.py)</p>
        <FileFormStep fileKey="jira-board" stepId="jira" onWritten={onDone} />
      </div>
    </div>
  );
}
