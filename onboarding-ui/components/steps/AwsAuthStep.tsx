"use client";

import { useState } from "react";
import { RunStep } from "@/components/steps/RunStep";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export function AwsAuthStep({ onDone }: { onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const command = "./scripts/aws-auth.sh";

  return (
    <div className="space-y-4">
      <div className="panel-flat p-4 space-y-3 anim-fade-in-up">
        <p className="text-sm flex items-start gap-2">
          <span>🔐</span>
          <span>
            Okta MFA can&apos;t be safely automated from a background process, so this step is
            guided, not one-click. Run this in your own terminal (from the repo root):
          </span>
        </p>
        <div className="flex items-center gap-2">
          <code className="mono text-sm field-input flex-1">{command} you@your-company.com</code>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${command} you@your-company.com`);
              setCopied(true);
              toast.success("Command copied");
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-soft)]">
          This prompts for MFA and writes credentials to ~/.aws/credentials. No credential
          material ever flows through this browser.
        </p>
      </div>

      <div className="panel-flat p-4">
        <p className="text-sm font-medium mb-3">Once that's done, verify (safe, non-interactive):</p>
        <RunStep
          scriptKey="aws-verify"
          stepId="aws-auth"
          label="Verify AWS credentials"
          successMessage="AWS credentials verified"
          confirmBody="Runs `aws sts get-caller-identity` — read-only, no credentials are written or transmitted by this tool."
          onDone={onDone}
        />
      </div>
    </div>
  );
}
