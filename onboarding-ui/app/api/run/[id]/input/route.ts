import { NextResponse } from "next/server";
import { writeInput } from "@/lib/processRegistry";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const runId = (await params).id;
  const body = (await req.json()) as { text: string };
  try {
    writeInput(runId, body.text ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
