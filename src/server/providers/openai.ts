export async function openaiComplete(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-5", input: prompt, max_output_tokens: 700 })
  });
  const data = await resp.json();
  const out = data.output?.[0]?.content?.[0]?.text;
  if (!out) throw new Error("No completion");
  return out;
}
