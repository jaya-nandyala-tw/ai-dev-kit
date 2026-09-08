import { NextResponse } from "next/server";
import { computeRecommendations } from "@/lib/recommendations";
import { readState } from "@/lib/stateStore";

export async function GET() {
  const state = readState();
  const items = computeRecommendations(state.profile);
  return NextResponse.json({ items });
}
