import { TEAM_LEAD_PROMPT } from "./prompts/teamLead";
import { callOpenAI } from "./providers/openai";
import { webSearch } from "./tools/websearch";
import {
  discoverAvailableModels,
  resolveModel,
  pickModel,
} from "./models/registry";

type Agent = {
  role: string;
  model: string;
  fallback?: string[];
  tools?: string[];
  prompt: string;
};

type TeamPlan = {
  goal: string;
  passes: string[];
  cost_estimate_tokens?: string | number;
  roster: Agent[];
};

function parseTeamPlan(text: string): TeamPlan {
  const planBlock = text.match(/<TEAM_PLAN>([\s\S]*?)<\/TEAM_PLAN>/i)?.[1] || "";
  const goal = planBlock.match(/goal:\s*(.*)/i)?.[1]?.trim() || "";
  const passesLine = planBlock.match(/passes:\s*\[([\s\S]*?)\]/i)?.[1] || "";
  const passes = passesLine
    .split(",")
    .map((s) => s.replace(/["'\s]/g, ""))
    .filter(Boolean);
  const roster: Agent[] = [];

  // crude JSON-ish roster parser
  const rosterMatches = [...planBlock.matchAll(/\{([\s\S]*?)\}/g)];
  for (const m of rosterMatches) {
    const obj = m[1];
    const role = obj.match(/role:\s*"?([^",]+)"?/i)?.[1]?.trim();
    const model = obj.match(/model:\s*"?([^",]+)"?/i)?.[1]?.trim();
    const prompt = obj.match(/prompt:\s*"(.*?)"/is)?.[1]?.trim() || "";
    const toolsRaw = obj.match(/tools:\s*\[([\s\S]*?)\]/i)?.[1] || "";
    const tools = toolsRaw
      ? toolsRaw.split(",").map((s) => s.replace(/["'\s]/g, "")).filter(Boolean)
      : [];
    if (role && model) roster.push({ role, model, prompt, tools });
  }

  return {
    goal,
    passes: passes.length ? passes : ["Plan", "Create", "Verify"],
    roster,
  };
}

async function callModel(model: string, system: string, user: string) {
  return await callOpenAI({
    model,
    system,
    messages: [{ role: "user", content: user }],
  });
}

// tiny helper to list models once (used by discoverAvailableModels)
const fetchJSON = async (url: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

export async function runTeamLeadOrchestration(opts: {
  userMessage: string;
  history?: Array<{ role: string; content: string }>;
  mock?: boolean;
}) {
  const { userMessage, history = [] } = opts;

  // 🔎 1) Discover which OpenAI models your key can actually use (cached per runtime)
  const available = await discoverAvailableModels(fetchJSON);

  // 🤝 2) Ask Team Lead to design the team (safely pick a lead model)
  const requestedLead = process.env.COUNSEL_LEAD_MODEL || "gpt-5";
  const leadModel = resolveModel(requestedLead, available);

  const leadOutput = await callModel(leadModel, TEAM_LEAD_PROMPT, userMessage);

  const plan = parseTeamPlan(leadOutput);
  if (!plan.roster.length) {
    // fallback minimal roster
    plan.roster = [
      {
        role: "Strategist",
        model: resolveModel("gpt-5", available),
        prompt: "Provide a crisp plan for the user's goal.",
      },
      {
        role: "Creator",
        model: resolveModel("gpt-4o", available),
        prompt: "Turn the plan into a concise deliverable for the user.",
      },
      {
        role: "Devil's Advocate",
        model: resolveModel("gpt-4o-mini", available),
        prompt: "List top 3 risks or missing data and fixes.",
      },
    ];
  }

  // ensure every agent's chosen model is resolvable/fallback-safe
  plan.roster = plan.roster.map((a) => ({
    ...a,
    model: resolveModel(a.model || pickModel(["reasoning"]), available),
  }));

  // 🗣️ 3) Run Pass 1 for each agent, emitting short outputs
  const agentMessages: Array<{ role: string; model: string; content: string }> =
    [];

  for (const agent of plan.roster) {
    if (agent.tools?.includes("web")) {
      try {
        const q = plan.goal || userMessage;
        const web = await webSearch(q);
        const top3 = web
          .slice(0, 3)
          .map((r) => `- ${r.title} (${r.url})`)
          .join("\n");
        const content = await callModel(
          agent.model,
          agent.prompt,
          `User: ${userMessage}\n\nRecent sources:\n${top3}\n\nGive a short, labeled output.`
        );
        agentMessages.push({ role: agent.role, model: agent.model, content });
        continue;
      } catch {
        // ignore web failure, fall through
      }
    }

    const content = await callModel(
      agent.model,
      agent.prompt || `You are ${agent.role}. Be concise.`,
      `User: ${userMessage}\nProvide a short, labeled output.`
    );
    agentMessages.push({ role: agent.role, model: agent.model, content });
  }

  // 🧠 4) Team Lead summary after the agents speak (also model-resolved)
  const summaryModel = resolveModel(
    process.env.COUNSEL_LEAD_MODEL || "gpt-5",
    available
  );
  const leadSummary = await callModel(
    summaryModel,
    "You are Team Lead. Summarize the team's outputs into a next-step recommendation. If conflicts exist, present 2 clear options.",
    agentMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n")
  );

  // 📤 5) Return for UI
  return {
    teamPlan: plan,
    messages: [
      { role: "system", content: "<TEAM_PLAN_READY>" },
      ...agentMessages.map((m) => ({
        role: "agent",
        speaker: m.role,
        model: m.model,
        content: m.content,
      })),
      {
        role: "lead",
        speaker: "Team Lead",
        model: summaryModel,
        content: leadSummary,
      },
    ],
  };
}


