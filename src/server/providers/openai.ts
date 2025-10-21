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
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
};

export async function callOpenAI({
  model,
  messages,
  temperature,
  max_tokens,
}: CallOpenAIArgs) {
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  return completion;
}
