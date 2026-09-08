import { NextResponse } from "next/server";
import { getContextItem, saveDraft } from "@/lib/contextStore";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = getContextItem(slug);
  if (!item) return NextResponse.json({ error: `Unknown context item "${slug}"` }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Draft content is required." }, { status: 400 });

  const { relPath } = saveDraft(slug, content);
  return NextResponse.json({ ok: true, relPath });
}
