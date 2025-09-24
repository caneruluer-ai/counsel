import { NextRequest, NextResponse } from "next/server";
// change alias imports to relative:
import { finalAnswer } from "../../../server/protocol";
import { runCounselDaily } from "../../../server/orchestrator";


export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const result = await runCounselDaily({
    userMessage: message,
    mock: process.env.MOCK === "1" || !process.env.OPENAI_API_KEY
  });
  finalAnswer.parse(result);
  return NextResponse.json(result);
}
