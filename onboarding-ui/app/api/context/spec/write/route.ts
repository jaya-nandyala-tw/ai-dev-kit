import { NextResponse } from "next/server";
import { writeSpecFiles } from "@/lib/specGenerator";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    baseSlug?: string;
    files?: { relPath: string; content: string }[];
    confirmedHashes?: Record<string, string>;
    force?: boolean;
  };
  const baseSlug = (body.baseSlug ?? "").trim();
  const files = body.files ?? [];

  if (!baseSlug) return NextResponse.json({ error: "Missing baseSlug." }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "No files to write." }, { status: 400 });

  const results = writeSpecFiles(baseSlug, files, body.confirmedHashes ?? {}, !!body.force);
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results });
}
