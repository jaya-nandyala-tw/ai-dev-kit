"use client";

import { useState } from "react";
import { HelpDrawer, HelpList, HelpSection } from "@/components/ui/HelpDrawer";
import { GLOBAL_HELP } from "@/lib/helpContent";

export function GlobalHelpFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help — how this works"
        className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shadow-lg transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(180deg, var(--accent-strong), var(--accent))",
          color: "white",
          boxShadow: "0 6px 20px -4px rgba(91,140,255,0.55)",
        }}
        title="Help / How this works?"
      >
        ?
      </button>
      <HelpDrawer open={open} onClose={() => setOpen(false)} title="How this works" icon="🛟">
        {GLOBAL_HELP.sections.map((section) => (
          <HelpSection key={section.title} title={section.title}>
            <HelpList items={section.body} />
          </HelpSection>
        ))}
      </HelpDrawer>
    </>
  );
}
