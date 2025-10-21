export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
};

type CallOpenAIArgs = {
  model: string;
  system?: string;
  messages?: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
};

/**
 * Minimal OpenAI caller using fetch (no SDK).
 * Returns assistant text (string) to match orchestrator expectations.
 */
export async function callOpenAI({
  model,
  system,
  messages = [],
  temperature,
  max_tokens,
}: CallOpenAIArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }

  const finalMessages: ChatMessage[] = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages,
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      temperature,
      max_tokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${text || res.statusText}`);
    }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
