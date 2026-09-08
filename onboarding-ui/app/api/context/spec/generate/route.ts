import { NextResponse } from "next/server";
import { getContextItem, readContextContent, slugify } from "@/lib/contextStore";
import { buildAggregatedSpecPrompt } from "@/lib/specGenerator";
import { startRun } from "@/lib/processRegistry";

// The prompt (and which context items feed it) is built entirely server-side from stored slugs —
// the client only ever sends slugs + a title, same trust model as /api/context/[slug]/generate.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slugs?: string[]; title?: string };
  const slugs = Array.isArray(body.slugs) ? body.slugs : [];
  const title = (body.title ?? "").trim();

  if (slugs.length === 0) return NextResponse.json({ error: "Select at least one context item." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "A title for the combined spec is required." }, { status: 400 });

  const items = slugs.map((slug) => getContextItem(slug));
  const missing = slugs.filter((_, i) => !items[i]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Unknown context item(s): ${missing.join(", ")}` }, { status: 404 });
  }
  const found = items as NonNullable<(typeof items)[number]>[];

  const category = found[0]!.category;
  if (!found.every((item) => item.category === category)) {
    return NextResponse.json({ error: "All selected items must be in the same category." }, { status: 400 });
  }

  const forPrompt = found.map((item) => ({ title: item.title, content: readContextContent(item) }));
  const prompt = buildAggregatedSpecPrompt(forPrompt, category, title);
  const baseSlug = slugify(title);

  try {
    const { runId } = startRun("copilot-suggest", [prompt]);
    return NextResponse.json({ runId, baseSlug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
