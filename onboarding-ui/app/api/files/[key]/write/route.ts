import { NextResponse } from "next/server";
import { getManagedFile, writeManagedFile } from "@/lib/managedFiles";
import { markStepMeta } from "@/lib/stateStore";

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = getManagedFile(key);
  if (!def) return NextResponse.json({ error: `Unknown file key "${key}"` }, { status: 404 });

  const body = (await req.json()) as {
    values: Record<string, unknown>;
    confirmedHashes: Record<string, string>;
    force?: boolean;
    stepId?: string;
  };

  try {
    const results = writeManagedFile(key, body.values ?? {}, body.confirmedHashes ?? {}, Boolean(body.force));
    const allOk = results.every((r) => r.ok);
    if (allOk && body.stepId) markStepMeta(body.stepId);
    return NextResponse.json({ results, ok: allOk });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
