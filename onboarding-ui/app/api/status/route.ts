import { NextResponse } from "next/server";
import { computeAllStatuses } from "@/lib/detectors";

export async function GET() {
  const { state, statuses } = computeAllStatuses();
  return NextResponse.json({ profile: state.profile, statuses, runs: state.runs.slice(-20) });
}
