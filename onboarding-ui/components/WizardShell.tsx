"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchStatus } from "@/lib/apiClient";
import type { ProfileAnswers, StepStatusEntry } from "@/types";

export type StatusContext = {
  profile: ProfileAnswers | null;
  statuses: Record<string, StepStatusEntry>;
  refresh: () => Promise<void>;
};

// No persistent sidebar — every page is single-column, full-width, matching the homepage's
// editorial layout. Progress is indicated per-page instead: ProgressRail on step pages, the
// Roadmap section on the homepage (which doubles as "jump to any step").
export function WizardShell({
  children,
}: {
  children: (ctx: StatusContext) => React.ReactNode;
}) {
  const [profile, setProfile] = useState<ProfileAnswers | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StepStatusEntry>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchStatus();
    setProfile(data.profile);
    setStatuses(data.statuses);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <main>{loaded ? children({ profile, statuses, refresh }) : <p className="text-[var(--muted)]">Loading…</p>}</main>;
}
