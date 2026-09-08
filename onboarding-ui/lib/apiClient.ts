// Thin fetch wrappers shared by client components. No Node imports — safe in the browser.
import type {
  ContextCategory,
  ContextItem,
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

export async function fetchContextItems(): Promise<{ items: ContextItem[]; categories: { value: ContextCategory; label: string }[] }> {
  const res = await fetch("/api/context", { cache: "no-store" });
  return res.json();
}

export async function createContextItem(input: {
  title: string;
  category: ContextCategory;
  content: string;
}): Promise<{ item?: ContextItem; error?: string }> {
  const res = await fetch("/api/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchContextFile(
  slug: string,
): Promise<{ item?: ContextItem; sourceContent?: string; draftContent?: string | null; error?: string }> {
  const res = await fetch(`/api/context/${slug}`, { cache: "no-store" });
  return res.json();
}

export async function startContextDraft(slug: string): Promise<{ runId?: string; error?: string }> {
  const res = await fetch(`/api/context/${slug}/generate`, { method: "POST" });
  return res.json();
}

export async function saveContextDraft(slug: string, content: string): Promise<{ ok?: boolean; relPath?: string; error?: string }> {
  const res = await fetch(`/api/context/${slug}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

/** Runs a script headlessly and resolves with its full stdout+stderr once it exits — for
 * inline "fill this field" affordances (the Sensor Dispatch Table's ✨ suggest button) where a
 * full TerminalPane would be too heavy for a single table cell. Prefer TerminalPane directly
 * when the run is worth watching live. */
export function runAndCapture(script: string, args: string[]): Promise<{ ok: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    startRun(script, args).then((started) => {
      if (!started.runId) {
        resolve({ ok: false, output: "", error: started.error ?? "Failed to start" });
        return;
      }
      let output = "";
      const stop = streamRun(started.runId, (event) => {
        if (event.type === "stdout" || event.type === "stderr") {
          output += event.data;
        } else if (event.type === "exit") {
          stop();
          resolve({ ok: event.code === 0, output });
        } else if (event.type === "error") {
          stop();
          resolve({ ok: false, output, error: event.message });
        }
      });
    });
  });
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
