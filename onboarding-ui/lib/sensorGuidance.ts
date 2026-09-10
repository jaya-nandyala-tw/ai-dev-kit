// Client-safe (no Node imports) — shared between the server-side managedFiles.ts (unused there
// directly, kept here so it can also be imported from a "use client" page) and the Sensor
// Dispatch Table step's UI note.
import type { ProfileAnswers } from "@/types";

/** Guidance shown above the (empty-by-default) Sensor Dispatch Table, telling a team which rows
 * they actually need to add for their own stack — based on their Profile answers — without
 * pre-filling any row values for them. Every team needs a core-service row; the rest are
 * conditional. */
export function sensorGuidanceNote(profile: ProfileAnswers | null): string {
  const needed = ["your core service's src + tests (every team needs this one)"];
  if (!profile || profile.buildsFrontend) needed.push("its ui/src (frontend build/test)");
  if (!profile || profile.hasIac) needed.push("your IaC module's *.tf files (terraform fmt/validate)");
  if (!profile || profile.hasWorkers) needed.push("each worker/lambda's src (its own test command)");
  return `Add one row per pattern you need — based on your Profile answers, that's: ${needed.join("; ")}.`;
}
