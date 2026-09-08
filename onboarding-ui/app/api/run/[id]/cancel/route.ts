import { NextResponse } from "next/server";
import { cancelRun } from "@/lib/processRegistry";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const runId = (await params).id;
  cancelRun(runId);
  return NextResponse.json({ ok: true });
}
