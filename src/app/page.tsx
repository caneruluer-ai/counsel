"use client";

import { useState } from "react";

export default function ConductorPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Accepts an optional override so buttons can send canned text safely
  const sendMessage = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content) return;

    const userMsg = { role: "user", content };
    setMessages((m) => [...m, userMsg]);

    // Only clear the input if we're sending from the input field
    if (!override) setInput("");

    setLoading(true);

    const res = await fetch("/api/conductor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content }),
    });

    const data = await res.json();
    setLoading(false);

    if (data?.messages) {
      setMessages((m) => [...m, ...data.messages]);
    } else if (data?.error) {
      setMessages((m) => [
        ...m,
        { role: "system", content: `❌ Error: ${data.error}` },
      ]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f] text-gray-100">
      <header className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold">Counsel — Team Chat</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "lead"
                  ? "bg-gray-800 border border-gray-700"
                  : msg.role === "agent"
                  ? "bg-gray-900 border border-gray-800"
                  : "bg-transparent text-gray-400"
              }`}
            >
              {msg.speaker && (
                <div className="text-xs opacity-70 mb-1">
                  {msg.speaker} • {msg.model}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

              {/* Team Lead summary actions */}
              {msg.role === "lead" && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="bg-blue-700 px-2 py-1 rounded text-xs"
                    onClick={() => sendMessage("Continue to next pass")}
                  >
                    Continue
                  </button>
                  <button
                    className="bg-gray-700 px-2 py-1 rounded text-xs"
                    onClick={() => sendMessage("Refine the current plan")}
                  >
                    Refine
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && <div className="text-gray-500">🤖 Thinking...</div>}
      </main>

      <footer className="p-4 border-t border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded text-sm font-medium"
        >
          Send
        </button>
      </footer>
    </div>
  );
}
