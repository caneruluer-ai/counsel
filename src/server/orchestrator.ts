import { FinalAnswer } from "./protocol";
import { webSearch } from "./tools/websearch";
import { openaiComplete } from "./providers/openai";
import { dailyAnalystPrompt, dailyCreatorPrompt, dailyVerifierPrompt } from "./prompts/daily";

type RunInput = { userMessage: string; mock: boolean };

export async function runCounselDaily({ userMessage, mock }: RunInput): Promise<FinalAnswer> {
  // Strategist (tiny plan)
  const plan = mock
    ? { objective: "Deliver the requested artifact quickly.", queries: [userMessage.slice(0,60)] }
    : safeJson(await openaiComplete(
        `You are Daily Strategist.
User: ${userMessage}
Create a 3–5 bullet Plan-in-brief and 2 short web search queries.
Return JSON: {"objective": "...", "queries": ["q1","q2"]}`
      ));

  // Analyst (search + synthesis)
  const hits = await webSearch(plan.queries, { mock, max: 2 });
  const synthesis = mock
    ? "Concise synthesis based on two credible sources (mock)."
    : await openaiComplete(dailyAnalystPrompt(userMessage, hits));

  // Creator (deliverable)
  const deliverable_md = mock
    ? `### Draft\nMock deliverable for: **${userMessage}**.\n- Point A\n- Point B\n\n**Alt:** shorter option.`
    : await openaiComplete(dailyCreatorPrompt(userMessage, synthesis));

  // Verifier (DA + fact check)
  const verification_md = mock
    ? `**Challenges**\n- Keep claims specific and cited.\n- Tighten wording.\n\n**Disclaimer**\n- Informational only; verify critical decisions.`
    : await openaiComplete(dailyVerifierPrompt(userMessage, synthesis, deliverable_md, hits));

  const messages = [
    { speaker: "Daily Strategist", model: mock ? "gpt-5 (mock)" : "gpt-5", role: "agent" as const,
      content_md: `**Plan-in-brief**\n- Objective: ${plan.objective}\n- Next: Analyst fetch 2 sources; Creator drafts.` },
    { speaker: "Daily Analyst", model: mock ? "claude-3.7 (mock)" : "claude-3.7", role: "agent" as const,
      content_md: synthesis, sources: hits },
    { speaker: "Daily Creator", model: mock ? "gpt-5 (mock)" : "gpt-5", role: "agent" as const,
      content_md: deliverable_md },
    { speaker: "Verifier", model: mock ? "gpt-5 (mock)" : "gpt-5", role: "agent" as const,
      content_md: verification_md }
  ];

  return {
    type: "FINAL_ANSWER",
    title: "Counsel Daily",
    summary: [
      "4-agent pass: Strategist → Analyst → Creator → Verifier (shown inline).",
      `Queries: ${plan.queries.join(" / ")}`,
      "Citations + ready-to-paste deliverable."
    ],
    deliverable_md,
    sources: hits.map(h => ({ title: h.title, domain: h.domain, url: h.url })),
    next_steps: [
      "Reply with constraints (tone/length/brand) to refine.",
      "Switch to Deep Mode for budget & risks."
    ],
    messages
  };
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return { objective: "", queries: [] }; }
}
