"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { HelpDialog, HelpIconList, HelpList, HelpSection } from "@/components/ui/HelpDialog";
import { GLOBAL_HELP } from "@/lib/helpContent";

const HelpContext = createContext<(() => void) | null>(null);

/** One shared "How this works" dialog instance, opened from anywhere via useGlobalHelp() — the
 * bottom-right FAB and the navbar's Help link both trigger the same dialog instead of each
 * mounting/owning their own copy of the (identical) global help content. */
export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openHelp = useMemo(() => () => setOpen(true), []);

  return (
    <HelpContext.Provider value={openHelp}>
      {children}
      <HelpDialog open={open} onClose={() => setOpen(false)} title="How this works" icon="🛟" size="lg">
        {GLOBAL_HELP.sections.map((section) => (
          <HelpSection key={section.title} title={section.title} icon={section.icon}>
            {"guarantees" in section ? <HelpIconList items={section.guarantees} /> : <HelpList items={section.body} />}
          </HelpSection>
        ))}
      </HelpDialog>
    </HelpContext.Provider>
  );
}

export function useGlobalHelp() {
  const openHelp = useContext(HelpContext);
  if (!openHelp) throw new Error("useGlobalHelp must be used within a HelpProvider");
  return openHelp;
}
