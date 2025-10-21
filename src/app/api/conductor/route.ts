import { NextResponse } from "next/server";
import { runTeamLeadOrchestration } from "../../../server/orchestrator";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid 'message' payload" },
        { status: 400 }
      );
    }

    const result = await runTeamLeadOrchestration({ userMessage: message });
    // result has shape: { teamPlan, messages: [...] }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Conductor error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
