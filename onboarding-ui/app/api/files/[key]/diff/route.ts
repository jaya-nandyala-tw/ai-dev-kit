import { NextResponse } from "next/server";
import { diffManagedFile, getManagedFile } from "@/lib/managedFiles";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = getManagedFile(key);
  if (!def) return NextResponse.json({ error: `Unknown file key "${key}"` }, { status: 404 });
  return NextResponse.json({
    key: def.key,
    label: def.label,
    relPaths: def.relPaths,
    fields: def.getFields ? def.getFields() : def.fields,
    currentValues: def.parseCurrentValues(),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = getManagedFile(key);
  if (!def) return NextResponse.json({ error: `Unknown file key "${key}"` }, { status: 404 });

  const body = (await req.json()) as { values: Record<string, unknown> };
  try {
    const diffs = diffManagedFile(key, body.values ?? {});
    return NextResponse.json({ diffs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
