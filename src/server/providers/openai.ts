import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
};

type CallOpenAIArgs = {
  model: string;
  system?: string;                // ✅ your orchestrator passes this
  messages?: ChatMessage[];       // user/assistant turns (optional)
  temperature?: number;
  max_tokens?: number;
};

/**
 * Returns the assistant text (string) to match your orchestrator’s expectations.
 * If `system` is provided, it's prepended as a system message.
 */
export async function callOpenAI({
  model,
  system,
  messages = [],
  temperature,
  max_tokens,
}: CallOpenAIArgs): Promise<string> {
  const finalMessages: ChatMessage[] = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages,
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: finalMessages,
    temperature,
    max_tokens,
  });

  return completion.choices?.[0]?.message?.content ?? "";
}
