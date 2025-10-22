"use client";

import { useState } from "react";

type Msg = {
  id: string;
  role: "user" | "agent" | "lead" | "system";
  speaker?: string;
  model?: string;
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendStreamed(text: string) {
    setLoading(true);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);

    const res = await fetch("/api/conductor/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!res.body) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "system", content: "No response body." }]);
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === "team_plan") {
            setMessages((m) => [...m, { id: crypto.randomUUID(), role: "system", content: "<TEAM_PLAN_READY>" }]);
          } else if (evt.type === "agent") {
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "agent",
                speaker: evt.role,
                model: evt.model,
                content: evt.content,
              },
            ]);
          } else if (evt.type === "lead") {
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "lead",
                speaker: "Team Lead",
                model: evt.model,
                content: evt.content,
              },
            ]);
          } else if (evt.type === "error") {
            setMessages((m) => [...m, { id: crypto.randomUUID(), role: "system", content: `❌ ${evt.message}` }]);
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    setLoading(false);
  }

  const onSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendStreamed(t);
  };

  return (
    <div className="h-screen flex bg-[#0b0b0b] text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 p-4 hidden md:flex flex-col gap-4">
        <div className="text-xl font-bold">LOGO</div>
        <nav className="text-sm space-y-2">
          <div className="opacity-70">New chat</div>
          <div className="opacity-70">Search chat</div>
          <div className="opacity-70">Library</div>
          <div className="opacity-70">Team builder</div>
          <div className="pt-4 opacity-60">Teams &gt;</div>
          <div className="opacity-60">Projects &gt;</div>
          <div className="opacity-60">Chats &gt;</div>
        </nav>
        <div className="mt-auto text-xs opacity-60">user name • (User Tier)</div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="p-5 border-b border-gray-800">
          <div className="text-red-400 text-sm mb-1">Choose your Team ▾</div>
          <h1 className="text-3xl font-bold">Team Lead</h1>
          <p className="mt-2 text-gray-300 max-w-2xl">
            👋 Hi, I’m your Team Lead. Tell me what you’d like to work on — I’ll instantly form the perfect AI team.
          </p>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-3 mt-5">
            {["Startup ideas","Legal documents","Content creation","Code debugging","Research & learning"].map((t) => (
              <button
                key={t}
                onClick={() => sendStreamed(`Help with: ${t}. Here is the context: ...`)}
                className="px-4 py-2 rounded-full border border-gray-700 hover:bg-gray-800 text-sm"
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-3xl ${m.role === "user" ? "ml-auto" : ""}`}>
              <div
                className={[
                  "rounded-xl p-4",
                  m.role === "user" ? "bg-blue-600 text-white" :
                  m.role === "lead" ? "bg-gray-800 border border-gray-700" :
                  m.role === "agent" ? "bg-gray-900 border border-gray-800" :
                  "bg-transparent text-gray-400 border border-gray-800",
                ].join(" ")}
              >
                {(m.speaker || m.model) && (
                  <div className="text-xs opacity-70 mb-1">
                    {m.speaker ? `${m.speaker}` : ""}{m.speaker && m.model ? " • " : ""}{m.model || ""}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-500">🤖 Thinking…</div>}
        </section>

        <footer className="p-4 border-t border-gray-800 flex gap-2">
          <input
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-3 text-sm"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <button onClick={onSend} disabled={loading} className="bg-blue-600 px-4 rounded text-sm font-medium">
            Run
          </button>
        </footer>
      </main>
    </div>
  );
}
