import { NextResponse } from "next/server";
import { isAtlassianConfigured } from "@/lib/detectors";

// The Acquire Context page's "From Confluence" tab is gated on this — Confluence reuses the
// same JIRA_BASE_URL/JIRA_API_TOKEN credentials (see atlassian_client/config.py), so there's no
// separate "Confluence token" to check for.
export async function GET() {
  return NextResponse.json({ configured: isAtlassianConfigured() });
}
