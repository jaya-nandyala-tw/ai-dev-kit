import { NextResponse } from "next/server";
import { getContextItem, readContextContent, readDraftContent } from "@/lib/contextStore";

// Backs the Explore panel — one fetch per selection returns everything the preview pane needs
// (the item's own metadata, its raw source content, and its generated draft if one exists).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = getContextItem(slug);
  if (!item) return NextResponse.json({ error: `Unknown context item "${slug}"` }, { status: 404 });

  return NextResponse.json({
    item,
    sourceContent: readContextContent(item),
    draftContent: readDraftContent(slug),
  });
}
