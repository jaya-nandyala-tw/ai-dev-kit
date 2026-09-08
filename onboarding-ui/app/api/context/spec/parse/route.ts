import { NextResponse } from "next/server";
import { buildSpecFilePreviews, parseAggregatedSpecOutput } from "@/lib/specGenerator";

// Parsing (and the strict relPath validation inside it) always happens server-side, never
// client-side — Copilot's raw text is untrusted input, and relPath ends up in a filesystem path.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { baseSlug?: string; rawOutput?: string };
  const baseSlug = (body.baseSlug ?? "").trim();
  const rawOutput = body.rawOutput ?? "";

  if (!baseSlug) return NextResponse.json({ error: "Missing baseSlug." }, { status: 400 });
  if (!rawOutput.trim()) return NextResponse.json({ error: "Missing rawOutput." }, { status: 400 });

  const parsed = parseAggregatedSpecOutput(rawOutput);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error, raw: rawOutput }, { status: 400 });
  }

  const files = buildSpecFilePreviews(baseSlug, parsed.files);
  return NextResponse.json({ files });
}
