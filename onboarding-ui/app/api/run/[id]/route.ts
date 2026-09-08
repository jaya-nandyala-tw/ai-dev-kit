import { NextResponse } from "next/server";
import { startRun } from "@/lib/processRegistry";
import { getScriptDef } from "@/lib/scriptDefs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const script = (await params).id;
  const def = getScriptDef(script);
  if (!def) return NextResponse.json({ error: `Unknown script "${script}"` }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { args?: string[] };
  const args = Array.isArray(body.args) ? body.args.map(String) : [];

  try {
    const { runId } = startRun(script, args);
    return NextResponse.json({ runId, label: def.label, command: def.command, args: [...def.baseArgs, ...args] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
