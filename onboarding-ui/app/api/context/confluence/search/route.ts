import { NextResponse } from "next/server";
import { isAtlassianConfigured } from "@/lib/detectors";
import { searchConfluencePages } from "@/lib/confluenceCli";

export async function GET(req: Request) {
  if (!isAtlassianConfigured()) {
    return NextResponse.json({ error: "Atlassian credentials are not configured (JIRA_BASE_URL / JIRA_API_TOKEN)." }, { status: 400 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim();
  const space = url.searchParams.get("space")?.trim() || undefined;
  if (!query) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });

  try {
    const pages = await searchConfluencePages(query, space);
    return NextResponse.json({ pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Confluence search failed: ${message}` }, { status: 502 });
  }
}
