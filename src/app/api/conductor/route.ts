import { NextRequest, NextResponse } from "next/server";
import { finalAnswer } from "../../../server/protocol";
import { runCounselDaily } from "../../../server/orchestrator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json().catch(() => ({}));
    if (!message?.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    const result = await runCounselDaily({
      userMessage: message,
      mock: process.env.MOCK === "1" || !process.env.OPENAI_API_KEY
    });
    finalAnswer.parse(result);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("conductor error:", err?.stack || err);
    return NextResponse.json(
      { error: String(err?.message || err || "internal") },
      { status: 500 }
    );
  }
}
