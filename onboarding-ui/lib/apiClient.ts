// Thin fetch wrappers shared by client components. No Node imports — safe in the browser.
import type {
  DiffResult,
  FieldSchema,
  OnboardingState,
  ProfileAnswers,
  RecommendationItem,
  RunEvent,
  StepStatusEntry,
} from "@/types";

export async function fetchStatus(): Promise<{
  profile: ProfileAnswers | null;
  statuses: Record<string, StepStatusEntry>;
  runs: unknown[];
}> {
  const res = await fetch("/api/status", { cache: "no-store" });
  return res.json();
}

export async function fetchRecommendations(): Promise<{ items: RecommendationItem[] }> {
  const res = await fetch("/api/recommendations", { cache: "no-store" });
  return res.json();
}

export async function saveProfile(profile: ProfileAnswers): Promise<OnboardingState> {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return res.json();
}

export async function fetchFileSchema(
  key: string,
): Promise<{ key: string; label: string; relPaths: string[]; fields: FieldSchema[]; currentValues: Record<string, unknown> }> {
  const res = await fetch(`/api/files/${key}/diff`, { cache: "no-store" });
  return res.json();
}

export async function fetchFileDiff(key: string, values: Record<string, unknown>): Promise<{ diffs: DiffResult[] }> {
  const res = await fetch(`/api/files/${key}/diff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  return res.json();
}

export async function writeFile(
  key: string,
  values: Record<string, unknown>,
  confirmedHashes: Record<string, string>,
  force: boolean,
  stepId?: string,
): Promise<{ ok: boolean; results: unknown[]; error?: string }> {
  const res = await fetch(`/api/files/${key}/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values, confirmedHashes, force, stepId }),
  });
  return res.json();
}

export async function fetchGhRepos(org: string): Promise<{ repos?: Array<{ name: string; visibility: string }>; error?: string }> {
  const res = await fetch(`/api/gh/repos?org=${encodeURIComponent(org)}`, { cache: "no-store" });
  return res.json();
}

export async function generateWorkspace(): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch("/api/workspace/generate", { method: "POST" });
  return res.json();
}

export async function startRun(script: string, args: string[]): Promise<{ runId?: string; error?: string; command?: string; args?: string[] }> {
  const res = await fetch(`/api/run/${script}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  return res.json();
}

export function streamRun(runId: string, onEvent: (event: RunEvent) => void): () => void {
  const es = new EventSource(`/api/run/${runId}/stream`);
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as RunEvent);
    } catch {
      // ignore malformed frames
    }
  };
  return () => es.close();
}

export async function sendRunInput(runId: string, text: string): Promise<void> {
  await fetch(`/api/run/${runId}/input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function cancelRun(runId: string): Promise<void> {
  await fetch(`/api/run/${runId}/cancel`, { method: "POST" });
}

export async function restartOnboarding(): Promise<void> {
  await fetch("/api/state", { method: "DELETE" });
}

export async function markStepDone(stepId: string): Promise<void> {
  await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markStep: stepId }),
  });
}
