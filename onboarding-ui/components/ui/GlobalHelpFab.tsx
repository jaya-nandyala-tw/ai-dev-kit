"use client";

import { useGlobalHelp } from "@/components/ui/HelpProvider";

// A true circular FAB, bottom-right, on every page — the one deliberate exception to the
// all-sharp system, same category as the terminal's round traffic-light dots: a floating
// action button reads as one because it's round, in the conventional corner. Opens the same
// dialog instance as the navbar's Help link (see HelpProvider).
export function GlobalHelpFab() {
  const openHelp = useGlobalHelp();

  return (
    <button
      onClick={openHelp}
      aria-label="Help — how this works"
      className="help-fab fixed bottom-6 right-6 z-40"
      style={{ boxShadow: "0 8px 24px -4px color-mix(in srgb, var(--accent) 45%, transparent)" }}
      title="Help / How this works?"
    >
      <span className="mono">?</span>
    </button>
  );
}
