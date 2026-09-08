"use client";

import { useState } from "react";
import { HelpDrawer, HelpExample, HelpList, HelpSection } from "@/components/ui/HelpDrawer";
import { STEP_HELP } from "@/lib/helpContent";

export function StepHelpButton({ stepId, title, icon }: { stepId: string; title: string; icon: string }) {
  const [open, setOpen] = useState(false);
  const content = STEP_HELP[stepId];
  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Help for ${title}`}
        title="Why does this step exist, and what does it change?"
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--muted-soft)] transition-colors"
      >
        ?
      </button>
      <HelpDrawer open={open} onClose={() => setOpen(false)} title={title} icon={icon}>
        <HelpSection title="Why this step exists">
          <HelpList items={content.why} />
        </HelpSection>
        <HelpSection title="What it actually changes">
          <HelpList items={content.impact} />
        </HelpSection>
        {content.examples && content.examples.length > 0 && (
          <HelpSection title="Example">
            {content.examples.map((ex, i) => (
              <HelpExample key={i} label={ex.label}>
                {ex.content}
              </HelpExample>
            ))}
          </HelpSection>
        )}
      </HelpDrawer>
    </>
  );
}
