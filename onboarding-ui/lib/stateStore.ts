import fs from "node:fs";
import path from "node:path";
import { STATE_FILE_PATH } from "./paths";
import type { OnboardingState, ProfileAnswers, RunLogEntry } from "@/types";

function emptyState(): OnboardingState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    profile: null,
    stepMeta: {},
    runs: [],
  };
}

export function readState(): OnboardingState {
  try {
    const raw = fs.readFileSync(STATE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as OnboardingState;
    if (parsed.version !== 1) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

function writeState(state: OnboardingState): void {
  fs.mkdirSync(path.dirname(STATE_FILE_PATH), { recursive: true });
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function updateProfile(profile: ProfileAnswers): OnboardingState {
  const state = readState();
  state.profile = profile;
  writeState(state);
  return state;
}

export function markStepMeta(
  stepId: string,
  method: "wizard" | "manual" = "wizard",
): OnboardingState {
  const state = readState();
  state.stepMeta[stepId] = { completedAt: new Date().toISOString(), method };
  writeState(state);
  return state;
}

export function appendRun(entry: RunLogEntry): OnboardingState {
  const state = readState();
  state.runs.push(entry);
  // Keep the log from growing unbounded across a long-lived onboarding session.
  if (state.runs.length > 200) state.runs = state.runs.slice(-200);
  writeState(state);
  return state;
}

export function updateRun(runId: string, patch: Partial<RunLogEntry>): OnboardingState {
  const state = readState();
  const run = state.runs.find((r) => r.runId === runId);
  if (run) Object.assign(run, patch);
  writeState(state);
  return state;
}

/**
 * "Restart onboarding" — clears the wizard's own tracked state (profile answers, step
 * completion metadata, run history) back to a fresh first-run. Deliberately does NOT touch any
 * file already written to the repo (CODEOWNERS, config/repos.json, .env, etc.) — those keep
 * whatever content they have, and most steps' status is re-derived live from that real file
 * state anyway (see lib/detectors.ts), not from this file. This only resets the parts that
 * really are just this tool's own memory: which stack questions were answered, and the
 * AWS-auth "verified" flag (the one status this tool intentionally doesn't re-derive live).
 */
export function resetState(): OnboardingState {
  const state = emptyState();
  writeState(state);
  return state;
}
