export const dailyAnalystPrompt = (userMsg: string, hits: {title:string,url:string,domain:string}[]) => `
Role: Daily Analyst
Mission: ≤400 word synthesis with 2–4 credible citations.
User goal: ${userMsg}
Sources:
${hits.map(h => `- ${h.title} (${h.domain}) ${h.url}`).join("\n")}
Output:
- 5–8 sentence synthesis
- Inline cite as [${hits[0]?.domain || "Source"}, 2025]
- Note any uncertainty.
`;

export const dailyCreatorPrompt = (userMsg: string, synthesis: string) => `
Role: Daily Creator
Mission: Produce a concise deliverable tailored to the user's ask.
User goal: ${userMsg}
Evidence (condensed):
${synthesis}

Output Markdown:
- Main deliverable (≤250–300 words when possible)
- One alt variant
- A strong title/hook if relevant
`;

export const dailyVerifierPrompt = (
  userMsg: string, synthesis: string, deliverable: string,
  hits: {title:string,url:string,domain:string}[]
) => `
Role: Verifier (Devil’s Advocate + Fact Check)
Mission: Challenge key claims; fix/flag issues; add disclaimer if needed.
User goal: ${userMsg}

Evidence (Analyst synthesis):
${synthesis}

Deliverable (Creator output, markdown):
${deliverable}

Sources seen:
${hits.map(h => `- ${h.title} (${h.domain}) ${h.url}`).join("\n")}

Output (≤150 words, markdown):
- **Challenges (3)**: brief bullets.
- **Fixes/Adjustments**: what changed or needs rewording.
- **Disclaimer**: add one line if med/legal/finance.
`;
