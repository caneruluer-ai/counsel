import { NextRequest, NextResponse } from "next/server";
import { runTeamLeadOrchestration } from "@/server/orchestrator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  try {
    const result = await runTeamLeadOrchestration({
      userMessage: message,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Conductor error:", err?.message || err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
