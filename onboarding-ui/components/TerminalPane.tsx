"use client";

import { useEffect, useRef, useState } from "react";
import { cancelRun, sendRunInput, streamRun } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import type { RunEvent } from "@/types";

export function TerminalPane({
  runId,
  onExit,
  onOutput,
}: {
  runId: string;
  onExit?: (code: number | null) => void;
  /** Called once on exit with the concatenated stdout text — for callers that want the run's
   * final output (e.g. a Copilot suggestion) rather than just watching it happen. */
  onOutput?: (text: string) => void;
}) {
  const [lines, setLines] = useState<{ kind: RunEvent["type"]; text: string }[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [exited, setExited] = useState<number | null | "running">("running");
  const scrollRef = useRef<HTMLDivElement>(null);
  // React state updates inside the streamRun callback are async, so `lines` itself would be
  // stale by the time an `exit` event arrives in the same effect run — track the raw text here
  // instead of reading back from state.
  const stdoutRef = useRef("");

  useEffect(() => {
    const stop = streamRun(runId, (event) => {
      if (event.type === "stdout" || event.type === "stderr") {
        if (event.type === "stdout") stdoutRef.current += event.data;
        setLines((prev) => [...prev, { kind: event.type, text: event.data }]);
      } else if (event.type === "prompt") {
        setPendingPrompt(event.prompt);
      } else if (event.type === "exit") {
        setExited(event.code);
        setPendingPrompt(null);
        onOutput?.(stdoutRef.current);
        onExit?.(event.code);
      } else if (event.type === "error") {
        setLines((prev) => [...prev, { kind: "stderr", text: `[error] ${event.message}` }]);
        setExited(-1);
      }
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  async function submitInput() {
    if (!inputValue.trim()) return;
    await sendRunInput(runId, inputValue);
    setLines((prev) => [...prev, { kind: "stdout", text: `> ${inputValue}\n` }]);
    setInputValue("");
    setPendingPrompt(null);
  }

  const running = exited === "running";

  return (
    <div className="panel-flat overflow-hidden anim-fade-in-up">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--danger)] opacity-60" />
            <span className="w-2 h-2 rounded-full bg-[var(--warn)] opacity-60" />
            <span className="w-2 h-2 rounded-full bg-[var(--ok)] opacity-60" />
          </span>
          <span className="text-[var(--muted)] flex items-center gap-1.5">
            {running ? (
              <>
                <span className="spinner" /> Running…
              </>
            ) : exited === 0 ? (
              <span style={{ color: "var(--ok)" }}>✓ Completed</span>
            ) : (
              <span style={{ color: "var(--danger)" }}>✕ Exited with code {exited}</span>
            )}
          </span>
        </div>
        {running && (
          <Button variant="ghost" size="sm" onClick={() => cancelRun(runId)} className="text-[var(--danger)]">
            Stop
          </Button>
        )}
      </div>
      {/* Fixed dark chrome regardless of site theme — like the traffic-light dots above, a
          terminal reads as a terminal because it's always dark, not because it follows
          whatever theme the rest of the app is in. */}
      <div
        ref={scrollRef}
        className={`mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto p-3 ${running ? "running-stripes" : ""}`}
        style={{ background: "#0a0a0a", color: "#d4d4d4", backgroundSize: "200% 100%" }}
      >
        {lines.length === 0 && <span style={{ color: "#6b6b6b" }}>Waiting for output…</span>}
        {lines.map((l, i) => (
          <span key={i} style={l.kind === "stderr" ? { color: "#ff6b6b" } : undefined}>
            {l.text}
          </span>
        ))}
      </div>
      {pendingPrompt && (
        <div className="p-2.5 border-t border-[var(--border-soft)] flex items-center gap-2 anim-fade-in-up">
          <span className="text-xs text-[var(--warn)] shrink-0">⏸ {pendingPrompt}</span>
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitInput()}
            className="field-input mono text-xs py-1"
            placeholder="type response, press Enter"
          />
          <Button variant="primary" size="sm" onClick={submitInput}>
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
