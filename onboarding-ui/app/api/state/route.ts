import { NextResponse } from "next/server";
import { readState, updateProfile, markStepMeta, resetState } from "@/lib/stateStore";
import type { ProfileAnswers } from "@/types";

export async function GET() {
  return NextResponse.json(readState());
}

// Powers "Restart onboarding" — resets this tool's own tracked state only. See the doc comment
// on resetState() for exactly what that does and doesn't touch.
export async function DELETE() {
  const state = resetState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { profile?: ProfileAnswers; markStep?: string };
  if (body.profile) {
    const state = updateProfile(body.profile);
    return NextResponse.json(state);
  }
  if (body.markStep) {
    const state = markStepMeta(body.markStep);
    return NextResponse.json(state);
  }
  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
