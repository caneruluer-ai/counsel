"use client";
import { useState } from "react";

type Source = { title:string; domain:string; url:string };
type Msg = { speaker:string; model:string; role:string; content_md:string; sources?: Source[] };
type FA = {
  type:"FINAL_ANSWER"; title:string; summary:string[];
  deliverable_md:string; sources:Source[]; next_steps:string[]; messages:Msg[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [fa, setFA] = useState<FA | null>(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    const res = await fetch("/api/conductor", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json(); setFA(data); setLoading(false);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Counsel — Daily</h1>
      <div className="mt-4 flex gap-2">
        <input className="flex-1 border rounded px-3 py-2"
          placeholder="Ask anything…"
          value={input} onChange={e=>setInput(e.target.value)} />
        <button onClick={run} disabled={loading || !input}
          className="px-4 py-2 rounded bg-black text-white">
          {loading ? "Thinking…" : "Run"}
        </button>
      </div>

      {fa && (
        <section className="mt-8 space-y-6">
          <div className="space-y-4">
            {fa.messages.map((m, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-xs">
                  {badgeFor(m.speaker)}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">
                    <b>{m.speaker}</b> <span className="ml-1">· {m.model}</span>
                  </div>
                  <article className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(m.content_md) }} />
                  {!!m.sources?.length && (
                    <ul className="mt-2 text-sm list-disc ml-5">
                      {m.sources.map((s, j) => (
                        <li key={j}>
                          <a className="underline" href={s.url} target="_blank">{s.title}</a>
                          <span className="text-gray-500"> ({s.domain})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <h2 className="text-lg font-medium">{fa.title} — Final Answer</h2>
            <ul className="list-disc ml-6 mt-2">{fa.summary.map((s,i)=><li key={i}>{s}</li>)}</ul>
            <article className="prose prose-sm max-w-none mt-3"
              dangerouslySetInnerHTML={{ __html: mdToHtml(fa.deliverable_md) }} />
            <div className="mt-3">
              <h3 className="font-medium">Sources</h3>
              <ul className="list-disc ml-6">
                {fa.sources.map((s,i)=>(
                  <li key={i}><a className="underline" href={s.url} target="_blank">{s.title}</a> <span className="text-gray-500">({s.domain})</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
function badgeFor(s: string){ if (s.includes("Strategist")) return "ST"; if (s.includes("Analyst")) return "AN"; if (s.includes("Verifier")) return "VF"; if (s.includes("Creator")) return "CR"; return "AG"; }
function mdToHtml(md: string) {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<b>$1</b>")
    .replace(/\n- (.*)/g, "<ul><li>$1</li></ul>")
    .replace(/\n/g, "<br/>");
}
