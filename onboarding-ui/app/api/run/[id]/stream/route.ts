import { buildRunStream } from "@/lib/sse";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const runId = (await params).id;
  return buildRunStream(runId);
}
