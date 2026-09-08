import { getHandle, replayHistory, subscribe } from "./processRegistry";
import type { RunEvent } from "@/types";

function frame(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Builds an SSE Response for a run: replays buffered history first (so a client that connects a
 * moment after the run started, or reconnects, doesn't miss anything), then streams live events,
 * closing the stream once the process has exited and that exit event has been delivered.
 */
export function buildRunStream(runId: string): Response {
  const handle = getHandle(runId);
  if (!handle) {
    return new Response(`data: ${JSON.stringify({ type: "error", runId, message: "Unknown run", ts: new Date().toISOString() })}\n\n`, {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of replayHistory(runId)) {
        controller.enqueue(encoder.encode(frame(event)));
      }
      if (handle.exited) {
        controller.close();
        return;
      }
      unsubscribe = subscribe(runId, (event) => {
        controller.enqueue(encoder.encode(frame(event)));
        if (event.type === "exit" || event.type === "error") controller.close();
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
