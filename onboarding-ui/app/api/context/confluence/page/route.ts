import { NextResponse } from "next/server";
import { isAtlassianConfigured } from "@/lib/detectors";
import { extractConfluencePageId, getConfluencePage } from "@/lib/confluenceCli";

export async function GET(req: Request) {
  if (!isAtlassianConfigured()) {
    return NextResponse.json({ error: "Atlassian credentials are not configured (JIRA_BASE_URL / JIRA_API_TOKEN)." }, { status: 400 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("id")?.trim();
  if (!raw) return NextResponse.json({ error: "Missing ?id= (a Confluence page ID or page URL)" }, { status: 400 });

  const pageId = extractConfluencePageId(raw);
  if (!pageId) {
    return NextResponse.json({ error: `Could not find a page ID in "${raw}" — paste the full Confluence page URL or its numeric ID.` }, { status: 400 });
  }

  try {
    const page = await getConfluencePage(pageId);
    return NextResponse.json({ page });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not load Confluence page ${pageId}: ${message}` }, { status: 502 });
  }
}
