import { NextResponse } from "next/server";
import { dynamicTeamOrchestration } from "../../../../server/orchestrator_stream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Invalid 'message' payload" }, { status: 400 });
  }

  const { readable, start } = dynamicTeamOrchestration({ userMessage: message });
  // kick off after returning the stream
  queueMicrotask(start);

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
