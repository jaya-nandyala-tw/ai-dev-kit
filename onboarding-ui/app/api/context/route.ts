import { NextResponse } from "next/server";
import { listContextItems, saveContextItem } from "@/lib/contextStore";
import { CONTEXT_CATEGORIES } from "@/types";
import type { ContextCategory } from "@/types";

export async function GET() {
  return NextResponse.json({ items: listContextItems(), categories: CONTEXT_CATEGORIES });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { title?: string; category?: string; content?: string };
  const title = (body.title ?? "").trim();
  const content = (body.content ?? "").trim();
  const category = (body.category ?? "uncategorized") as ContextCategory;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
  }
  if (!CONTEXT_CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json({ error: `Unknown category "${category}".` }, { status: 400 });
  }

  try {
    const item = saveContextItem({ title, category, content });
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
