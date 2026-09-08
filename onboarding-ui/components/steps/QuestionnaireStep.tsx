"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import { getAdjacentStepIds } from "@/lib/stepDefs";
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
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(initial ?? EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveProfile(answers);
    setSaving(false);
    toast.success("Stack profile saved.");
    onSaved();
  }

  async function saveAndContinue() {
    setSaving(true);
    await saveProfile(answers);
    setSaving(false);
    toast.success("Stack profile saved — the rest of the flow now matches your answers.");
    onSaved();
    const { next } = getAdjacentStepIds("stack-profile", answers);
    router.push(next ? `/steps/${next.id}` : "/recommendations");
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
              onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: !prev[q.key] }))}
              className="text-left panel-flat card-interactive p-4 flex flex-col gap-2.5 anim-fade-in-up"
              style={checked ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
            >
              <span className="flex items-start justify-between">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                  style={{ background: checked ? "var(--accent-soft)" : "var(--bg-elevated)" }}
                >
                  {q.icon}
                </span>
                <span
                  className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: checked ? "var(--accent)" : "var(--border)",
                    background: checked ? "var(--accent)" : "transparent",
                    color: "white",
                  }}
                >
                  {checked && <span className="text-xs anim-pop">✓</span>}
                </span>
              </span>
              <span className="text-sm">{q.label}</span>
              {q.help && <span className="text-xs text-[var(--muted-soft)]">{q.help}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={save} loading={saving}>
          Save
        </Button>
        <Button variant="primary" onClick={saveAndContinue} loading={saving}>
          Save & continue →
        </Button>
      </div>
    </div>
  );
}
