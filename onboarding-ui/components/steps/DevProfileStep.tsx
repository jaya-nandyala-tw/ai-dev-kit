"use client";

import { useEffect, useState } from "react";
import { fetchFileDiff, markStepDone, startRun, writeFile } from "@/lib/apiClient";
import { FileFormStep } from "@/components/steps/FileFormStep";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TerminalPane } from "@/components/TerminalPane";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

const PROFILES: Array<{ name: string; icon: string; desc: string }> = [
  { name: "fullstack", icon: "🧩", desc: "DB + service + UI + mocks" },
  { name: "fullstack-docker", icon: "🐳", desc: "Same, service in Docker" },
  { name: "backend", icon: "🔧", desc: "DB + service + mocks" },
  { name: "frontend", icon: "🖥️", desc: "UI only" },
  { name: "lambda", icon: "λ", desc: "DB + mocks for workers" },
  { name: "integration", icon: "🔗", desc: "Real deployed AWS" },
  { name: "aws-login", icon: "☁️", desc: "AWS/Okta login only" },
];

export function DevProfileStep({ onDone }: { onDone: () => void }) {
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [active, setActive] = useState<{ runId: string; name: string } | null>(null);

  useEffect(() => {
    fetchFileDiff("env-template", {}).then((res) => {
      setNeedsTemplate(!res.diffs?.[0]?.currentExists);
    });
  }, []);

  async function applyProfile(name: string) {
    setPending(null);
    const res = await startRun("profile", ["apply", name]);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setActive({ runId: res.runId!, name });
  }

  return (
    <div className="space-y-4">
      {needsTemplate && (
        <div className="panel-flat p-4 anim-fade-in-up" style={{ borderColor: "var(--warn)" }}>
          <p className="text-sm mb-2">
            This kit ships no .env.template (by design — see README). scripts/profile.sh needs one
            to seed .env from. Create a minimal one now:
          </p>
          <Button
            variant="primary"
            loading={creating}
            onClick={async () => {
              setCreating(true);
              const res = await writeFile("env-template", {}, {}, false);
              setCreating(false);
              if (res.ok) {
                setNeedsTemplate(false);
                toast.success(".env.template created");
              }
            }}
          >
            Create .env.template
          </Button>
        </div>
      )}
      <div className="panel-flat p-4">
        <p className="text-sm font-medium mb-3">Your details</p>
        <FileFormStep
          fileKey="env"
          stepId="dev-profile"
          onWritten={onDone}
          fieldFilter={["DEV_EMAIL", "AWS_ENV", "AWS_PROFILE"]}
          extraFieldsNote="Preserved across profile switches by scripts/profile.sh."
        />
      </div>
      <div className="panel-flat p-4">
        <p className="text-sm font-medium mb-3">Apply a local dev profile</p>
        <p className="text-xs text-[var(--muted)] mb-3">
          Writes to .env, creating it from .env.template first if needed.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.name}
              onClick={() => setPending(p.name)}
              className="panel-flat card-interactive p-2.5 flex items-center justify-between gap-2 text-left"
            >
              <span className="text-sm flex items-center gap-2 min-w-0">
                <span>{p.icon}</span>
                <span className="min-w-0">
                  <span className="mono block">{p.name}</span>
                  <span className="text-xs text-[var(--muted-soft)] block">{p.desc}</span>
                </span>
              </span>
              <span className="btn btn-secondary btn-sm">Apply</span>
            </button>
          ))}
        </div>

        {active && (
          <div className="mt-3 anim-fade-in-up">
            <p className="text-xs text-[var(--muted)] mb-1.5">
              scripts/profile.sh apply <span className="mono">{active.name}</span>
            </p>
            <TerminalPane
              runId={active.runId}
              onExit={(code) => {
                if (code === 0) {
                  markStepDone("dev-profile").then(onDone);
                  toast.success(`Applied profile "${active.name}"`);
                } else {
                  toast.error(`profile.sh exited with code ${code}`);
                }
              }}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={`Apply profile "${pending}"`}
        body={`Runs scripts/profile.sh apply ${pending}. This rewrites .env's profile block.`}
        confirmLabel="Apply"
        onConfirm={() => pending && applyProfile(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
