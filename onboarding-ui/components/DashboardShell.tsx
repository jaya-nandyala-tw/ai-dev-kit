"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchStatus } from "@/lib/apiClient";
import { Stepper } from "./Stepper";
import type { ProfileAnswers, StepStatusEntry } from "@/types";

export type StatusContext = {
  profile: ProfileAnswers | null;
  statuses: Record<string, StepStatusEntry>;
  refresh: () => Promise<void>;
};

export function DashboardShell({
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-[22.5rem_1fr] gap-6">
      <Stepper statuses={statuses} profile={profile} />
      <main>{loaded ? children({ profile, statuses, refresh }) : <p className="text-[var(--muted)]">Loading…</p>}</main>
    </div>
  );
}
