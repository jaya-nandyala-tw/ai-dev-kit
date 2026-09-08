import { NextResponse } from "next/server";
import { getContextItem, readContextContent, buildDraftPrompt } from "@/lib/contextStore";
import { startRun } from "@/lib/processRegistry";

// The prompt is built server-side from the stored item rather than trusted from the client —
// the client only ever needs to know the slug to kick this off. Streaming happens over the same
// runId-keyed /api/run/[id]/stream SSE endpoint every other run in this app already uses.
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = getContextItem(slug);
  if (!item) return NextResponse.json({ error: `Unknown context item "${slug}"` }, { status: 404 });

  const content = readContextContent(item);
  const prompt = buildDraftPrompt(item, content);

  try {
    const { runId } = startRun("copilot-suggest", [prompt]);
    return NextResponse.json({ runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
