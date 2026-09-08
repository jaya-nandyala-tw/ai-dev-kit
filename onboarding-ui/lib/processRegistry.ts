import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import type { RunEvent } from "@/types";
import { appendRun, updateRun } from "./stateStore";
import { getScriptDef } from "./scriptDefs";

type Handle = {
  runId: string;
  scriptKey: string;
  args: string[];
  child: ChildProcessWithoutNullStreams;
  events: RunEvent[];
  subscribers: Set<(event: RunEvent) => void>;
  exited: boolean;
  exitCode: number | null;
  stdoutTail: string;
  idleTimer: NodeJS.Timeout | null;
};

// A globalThis-backed singleton so the registry survives Next.js dev-mode module reloads (HMR
// would otherwise create a fresh, empty Map on every edit and orphan running processes).
const g = globalThis as unknown as { __onboardingRunRegistry?: Map<string, Handle> };
const registry: Map<string, Handle> = g.__onboardingRunRegistry ?? new Map();
g.__onboardingRunRegistry = registry;

const IDLE_PROMPT_MS = 600;

function emit(handle: Handle, event: RunEvent) {
  handle.events.push(event);
  if (handle.events.length > 2000) handle.events.splice(0, handle.events.length - 2000);
  for (const sub of handle.subscribers) sub(event);
}

function resetIdleTimer(handle: Handle) {
  if (handle.idleTimer) clearTimeout(handle.idleTimer);
  handle.idleTimer = setTimeout(() => {
    if (handle.exited) return;
    const tail = handle.stdoutTail.trim();
    if (tail.length > 0 && !tail.endsWith("\n")) {
      emit(handle, {
        type: "prompt",
        runId: handle.runId,
        prompt: tail.slice(-200),
        ts: new Date().toISOString(),
      });
    }
  }, IDLE_PROMPT_MS);
}

export function startRun(scriptKey: string, args: string[]): { runId: string } {
  const def = getScriptDef(scriptKey);
  if (!def) throw new Error(`Unknown script "${scriptKey}"`);

  const runId = crypto.randomUUID();
  const child = spawn(def.command, [...def.baseArgs, ...args], {
    cwd: def.cwd,
    shell: false,
    env: { ...process.env, ...def.env },
  });

  const handle: Handle = {
    runId,
    scriptKey,
    args,
    child,
    events: [],
    subscribers: new Set(),
    exited: false,
    exitCode: null,
    stdoutTail: "",
    idleTimer: null,
  };
  registry.set(runId, handle);

  appendRun({
    runId,
    script: scriptKey,
    args,
    startedAt: new Date().toISOString(),
  });

  child.stdout.on("data", (chunk: Buffer) => {
    const data = chunk.toString("utf8");
    handle.stdoutTail = (handle.stdoutTail + data).slice(-500);
    if (data.includes("\n")) handle.stdoutTail = "";
    emit(handle, { type: "stdout", runId, data, ts: new Date().toISOString() });

    const known = def.promptPatterns?.find((p) => p.pattern.test(data));
    if (known) {
      emit(handle, { type: "prompt", runId, prompt: known.prompt, ts: new Date().toISOString() });
    } else {
      resetIdleTimer(handle);
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    emit(handle, {
      type: "stderr",
      runId,
      data: chunk.toString("utf8"),
      ts: new Date().toISOString(),
    });
  });

  child.on("error", (err) => {
    emit(handle, { type: "error", runId, message: err.message, ts: new Date().toISOString() });
  });

  child.on("exit", (code) => {
    handle.exited = true;
    handle.exitCode = code;
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    emit(handle, { type: "exit", runId, code, ts: new Date().toISOString() });
    updateRun(runId, { endedAt: new Date().toISOString(), exitCode: code });
  });

  return { runId };
}

export function getHandle(runId: string): Handle | undefined {
  return registry.get(runId);
}

export function subscribe(runId: string, cb: (event: RunEvent) => void): () => void {
  const handle = registry.get(runId);
  if (!handle) throw new Error(`Unknown run "${runId}"`);
  handle.subscribers.add(cb);
  return () => handle.subscribers.delete(cb);
}

export function replayHistory(runId: string): RunEvent[] {
  return getHandle(runId)?.events ?? [];
}

export function writeInput(runId: string, text: string): void {
  const handle = registry.get(runId);
  if (!handle || handle.exited) throw new Error(`Run "${runId}" is not accepting input`);
  handle.child.stdin.write(text.endsWith("\n") ? text : text + "\n");
}

export function cancelRun(runId: string): void {
  const handle = registry.get(runId);
  if (!handle || handle.exited) return;
  handle.child.kill("SIGINT");
  setTimeout(() => {
    if (!handle.exited) handle.child.kill("SIGTERM");
  }, 3000);
}
