"use client";

import { RunStep } from "@/components/steps/RunStep";
import { FileFormStep } from "@/components/steps/FileFormStep";
import type { StepStatusEntry } from "@/types";

export function PreCommitStep({
  hooksStatus,
  onDone,
}: {
  hooksStatus?: StepStatusEntry;
  onDone: () => void;
}) {
  const hookInstalled = hooksStatus?.status === "done";

  return (
    <div className="space-y-5">
      {/* Sub-step 1 — install. Skipped in favor of a confirmation once the real on-disk check
          (detectors.ts reading .git/hooks/pre-commit) already says it's there, instead of
          re-showing the install button every time this step is revisited. */}
      <div className="space-y-2">
        <span className="label-micro">1. Install the hook</span>
        {hookInstalled ? (
          <p className="text-sm text-[var(--success)]">
            ✓ Already installed — .git/hooks/pre-commit is wired up in this repo. Nothing to do here.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">
              This is the one real automated guardrail shared by humans and agents alike — it catches lint, format,
              and security issues before a commit lands, not after a PR is already open.
            </p>
            <RunStep
              scriptKey="pre-commit-install"
              stepId="pre-commit"
              label="Install pre-commit + hook"
              confirmBody="Runs: pip3 install pre-commit && pre-commit install"
              onDone={onDone}
            />
          </>
        )}
      </div>

      {/* Sub-step 2 — point the hooks at real directories. Always shown (not gated on hookInstalled)
          since the .pre-commit-config.yaml globs can be edited independently of whether the hook
          itself is installed yet. */}
      <div className="space-y-2 border-t border-[var(--border-soft)] pt-4">
        <span className="label-micro">2. Point the hooks at your real directories</span>
        <p className="text-sm text-[var(--muted)]">
          Why: the hooks ship with placeholder globs (<code>&lt;service&gt;</code>, <code>&lt;lambdas-or-workers&gt;</code>) that
          match nothing on disk — until you fill these in, the checks above silently run against zero files.
        </p>
        <p className="text-sm text-[var(--muted)]">
          How: enter the directory names as they actually appear under <code>codebase/</code>. For example, if your core
          service lives at <code>codebase/billing-service</code>, enter <code>billing-service</code>. Leave the IaC field
          blank if you have no Terraform repo — the Terraform hook block is removed instead of left pointing at a
          placeholder.
        </p>
        <FileFormStep fileKey="pre-commit-config" stepId="pre-commit" onWritten={onDone} />
      </div>
    </div>
  );
}
