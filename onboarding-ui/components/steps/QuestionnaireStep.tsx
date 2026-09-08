"use client";

import { useState } from "react";
import { saveProfile } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import type { ProfileAnswers } from "@/types";

const QUESTIONS: Array<{ key: keyof ProfileAnswers; icon: string; label: string; help?: string }> = [
  { key: "hasFrontend", icon: "🖥️", label: "Do you have a frontend (web/mobile UI) codebase?" },
  { key: "hasBackend", icon: "🔧", label: "Do you have backend/API services?" },
  { key: "hasWorkers", icon: "λ", label: "Do you build/maintain Lambda or worker functions?" },
  { key: "hasIac", icon: "🏗️", label: "Do you manage infrastructure as code (Terraform/CDK) in a dedicated repo?" },
  { key: "usesJira", icon: "🎫", label: "Do you track tickets in Jira Cloud?" },
  {
    key: "usesOktaAws",
    icon: "☁️",
    label: "Does your team touch AWS at all via Okta SSO?",
    help: "Deliberately broad — deployments, one-off migration scripts, POC/scratch work, log tailing, anything that needs aws CLI creds counts, not just a standing deployment pipeline.",
  },
  { key: "usesDockerCompose", icon: "🐳", label: "Does local dev use Docker Compose?" },
];

export function QuestionnaireStep({
  initial,
  onSaved,
}: {
  initial: ProfileAnswers | null;
  onSaved: () => void;
}) {
  const [answers, setAnswers] = useState<ProfileAnswers>(
    initial ?? {
      hasFrontend: false,
      hasBackend: false,
      hasWorkers: false,
      hasIac: false,
      usesJira: false,
      usesOktaAws: false,
      usesDockerCompose: false,
    },
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveProfile(answers);
    setSaving(false);
    toast.success("Stack profile saved — the rest of the flow now matches your answers.");
    onSaved();
  }

  return (
    <div className="space-y-3">
      {QUESTIONS.map((q) => {
        const checked = answers[q.key];
        return (
          <button
            key={q.key}
            type="button"
            onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: !prev[q.key] }))}
            className="w-full text-left panel-flat card-interactive p-3.5 flex items-start gap-3 anim-fade-in-up"
            style={checked ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
              style={{ background: checked ? "var(--accent-soft)" : "var(--bg-elevated)" }}
            >
              {q.icon}
            </span>
            <span className="flex-1 pt-1">
              <span className="text-sm block">{q.label}</span>
              {q.help && <span className="text-xs text-[var(--muted-soft)] block mt-1">{q.help}</span>}
            </span>
            <span
              className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1.5 transition-all"
              style={{
                borderColor: checked ? "var(--accent)" : "var(--border)",
                background: checked ? "var(--accent)" : "transparent",
                color: "white",
              }}
            >
              {checked && <span className="text-xs anim-pop">✓</span>}
            </span>
          </button>
        );
      })}
      <div className="pt-2">
        <Button variant="primary" onClick={save} loading={saving}>
          Save & continue
        </Button>
      </div>
    </div>
  );
}
