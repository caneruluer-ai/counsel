type Hit = { title: string; url: string; domain: string };
type Opts = { mock: boolean; max?: number };

export async function webSearch(queries: string[], opts: Opts): Promise<Hit[]> {
  if (opts.mock) {
    return [
      { title: "Example Source One", url: "https://example.com/a", domain: "example.com" },
      { title: "Example Source Two", url: "https://example.org/b", domain: "example.org" }
    ].slice(0, opts.max ?? 2);
  }
  const key = process.env.SERPER_API_KEY || process.env.BRAVE_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY or BRAVE_API_KEY missing");
  // Serper example:
  const q = queries.join(" ");
  const resp = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: opts.max ?? 2 })
  });
  const data = await resp.json();
  return (data.organic || []).slice(0, opts.max ?? 2).map((r: any) => ({
    title: r.title, url: r.link, domain: new URL(r.link).hostname
  }));
}
