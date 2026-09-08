import { NextResponse } from "next/server";
// pdf-parse ships as CommonJS with no ESM build — the `.default` fallback keeps this working
// whether Next's bundler resolves it as an interop-wrapped default or the raw function export.
import pdfParseImport from "pdf-parse";
const pdfParse = (pdfParseImport as unknown as { default?: typeof pdfParseImport }).default ?? pdfParseImport;

const MAX_BYTES = 20 * 1024 * 1024; // 20MB — plenty for a text-heavy doc, small enough to keep in memory

// Extraction only — nothing is written to disk here. The caller (Acquire Context page) reviews
// and edits the extracted text before it ever reaches POST /api/context, same as every other
// intake path in this app.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB) — limit is 20MB.` }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();
    if (!text) {
      return NextResponse.json({ error: "No extractable text found in that PDF (it may be scanned/image-only)." }, { status: 400 });
    }
    const suggestedTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
    return NextResponse.json({ title: suggestedTitle, content: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not read that PDF: ${message}` }, { status: 400 });
  }
}
