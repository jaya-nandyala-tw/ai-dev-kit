"use client";

import { useState } from "react";
import { saveProfile } from "@/lib/apiClient";
import type { ProfileAnswers } from "@/types";

const QUESTIONS: Array<{ key: keyof ProfileAnswers; icon: string; label: string; help?: string }> = [
  { key: "hasWorkers", icon: "λ", label: "Do you build/maintain Lambda or worker functions?" },
  { key: "hasIac", icon: "🏗️", label: "Do you manage infrastructure as code (Terraform/CDK) in a dedicated repo?" },
  { key: "usesJira", icon: "🎫", label: "Do you track tickets in Jira Cloud?" },
];

const EMPTY_ANSWERS: ProfileAnswers = {
  hasWorkers: false,
  hasIac: false,
  usesJira: false,
};

export function QuestionnaireStep({
  initial,
  onSaved,
}: {
  initial: ProfileAnswers | null;
  onSaved: () => void;
}) {
  const [answers, setAnswers] = useState<ProfileAnswers>(initial ?? EMPTY_ANSWERS);
  const [savingKey, setSavingKey] = useState<keyof ProfileAnswers | null>(null);

  // No separate Save action — every toggle persists immediately, so the page-level Continue
  // button (app/steps/[stepId]/page.tsx) can just navigate; there's never unsaved state to lose.
  async function toggle(key: keyof ProfileAnswers) {
    const next = { ...answers, [key]: !answers[key] };
    setAnswers(next);
    setSavingKey(key);
    await saveProfile(next);
    setSavingKey(null);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {QUESTIONS.map((q) => {
          const checked = answers[q.key];
          return (
            <button
              key={q.key}
              type="button"
              onClick={() => toggle(q.key)}
              className="text-left panel-flat card-interactive p-4 flex flex-col gap-2.5 anim-fade-in-up"
              style={checked ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
            >
              <span className="flex items-start justify-between">
                <span
                  className="w-9 h-9 border flex items-center justify-center shrink-0 text-base"
                  style={{ background: checked ? "var(--accent-soft)" : "var(--bg-elevated)", borderColor: "var(--border-soft)" }}
                >
                  {q.icon}
                </span>
                <span
                  className="w-5 h-5 border flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: checked ? "var(--accent)" : "var(--border)",
                    background: checked ? "var(--accent)" : "transparent",
                    color: "var(--bg)",
                  }}
                >
                  {savingKey === q.key ? (
                    <span className="spinner" style={{ width: "0.65em", height: "0.65em" }} />
                  ) : (
                    checked && <span className="text-xs anim-pop">✓</span>
                  )}
                </span>
              </span>
              <span className="text-sm font-medium">{q.label}</span>
              {q.help && <span className="text-xs text-[var(--muted-soft)]">{q.help}</span>}
            </button>
          );
        })}
      </div>
      <p className="mono text-xs text-[var(--muted-soft)]">Saved automatically — use Continue below when you're ready.</p>
    </div>
  );
}
