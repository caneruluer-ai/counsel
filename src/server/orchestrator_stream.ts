import { callOpenAI } from "./providers/openai";
import { TEAM_LEAD_PROMPT } from "./prompts/teamLead";
import { discoverAvailableModels, resolveModel, pickModel } from "./models/registry";

type Event =
  | { type: "team_plan"; plan: any }
  | { type: "agent"; role: string; model: string; content: string }
  | { type: "lead"; model: string; content: string }
  | { type: "error"; message: string };

function toNDJSON(e: Event) {
  return JSON.stringify(e) + "\n";
}

const fetchJSON = async (url: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

function parsePlan(text: string, fallbackGoal: string) {
  const plan: any = { goal: fallbackGoal, passes: ["Plan", "Create", "Verify"], roster: [] as any[] };
  const m = text.match(/<TEAM_PLAN>([\s\S]*?)<\/TEAM_PLAN>/i);
  if (!m) return plan;
  const b = m[1];

  const passes = (b.match(/passes:\s*\[([\s\S]*?)\]/i)?.[1] || '"Plan","Create","Verify"')
    .split(",").map(s => s.replace(/["'\s]/g,"")).filter(Boolean);
  plan.passes = passes.length ? passes : plan.passes;

  const roster = [...b.matchAll(/\{([\s\S]*?)\}/g)].map(x => x[1]);
  plan.roster = roster.map(r => ({
    role: r.match(/role:\s*"?([^",]+)"?/i)?.[1]?.trim() || "Specialist",
    model: r.match(/model:\s*"?([^",]+)"?/i)?.[1]?.trim() || "gpt-4o-mini",
    prompt: r.match(/prompt:\s*"(.*?)"/is)?.[1]?.trim() || "Be concise.",
  }));

  return plan;
}

export function dynamicTeamOrchestration({ userMessage }: { userMessage: string }) {
  const ts = new TransformStream();
  const writer = ts.writable.getWriter();
  const readable = ts.readable;

  const start = async () => {
    try {
      const available = await discoverAvailableModels(fetchJSON);

      // 1) Team Lead designs team (choose safest available model)
      const leadModel = resolveModel(process.env.COUNSEL_LEAD_MODEL || "gpt-5", available);
      const planText = await callOpenAI({
        model: leadModel,
        system: TEAM_LEAD_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 900,
      });

      const plan = parsePlan(planText, userMessage);
      if (!plan.roster?.length) {
        plan.roster = [
          { role: "Strategist", model: resolveModel("gpt-5", available), prompt: "Outline a crisp plan." },
          { role: "Creator", model: resolveModel("gpt-4o", available), prompt: "Turn the plan into a concise deliverable." },
        ];
      }
      // make sure each role uses an allowed model
      plan.roster = plan.roster.map((a: any) => ({
        ...a,
        model: resolveModel(a.model || pickModel(["reasoning"]), available),
      }));

      await writer.write(toNDJSON({ type: "team_plan", plan }));

      // 2) Run each agent sequentially and stream results as they finish
      for (const agent of plan.roster) {
        const content = await callOpenAI({
          model: agent.model,
          system: `You are ${agent.role}. ${agent.prompt}`,
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 700,
        });
        await writer.write(toNDJSON({ type: "agent", role: agent.role, model: agent.model, content }));
      }

      // 3) Team Lead summary
      const leadSummary = await callOpenAI({
        model: leadModel,
        system: "You are Team Lead. Summarize the team's outputs and recommend the next step.",
        messages: [{ role: "user", content: "Summarize the agents' outputs and propose next actions." }],
        max_tokens: 500,
      });
      await writer.write(toNDJSON({ type: "lead", model: leadModel, content: leadSummary }));
    } catch (e: any) {
      await writer.write(toNDJSON({ type: "error", message: e?.message || String(e) }));
    } finally {
      await writer.close();
    }
  };

  return { readable, start };
}
