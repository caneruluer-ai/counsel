export async function openaiComplete(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  // Use a widely-available model
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: 700 })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  // Try multiple shapes defensively
  const out =
    data.output?.[0]?.content?.[0]?.text ??
    data.output_text ??
    data.choices?.[0]?.message?.content ??
    data.choices?.[0]?.text;

  if (!out) throw new Error("No completion from OpenAI");
  return out;
}
