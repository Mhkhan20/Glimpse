"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  videoId: string;
  seekTo: ((seconds: number) => void) | null;
};

const TIMESTAMP_RE = /\[(\d{1,2}:)?\d{1,2}:\d{2}\]/g;

function parseTimestamp(raw: string): number {
  const parts = raw.replace(/[[\]]/g, "").split(":").map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  const [m, s] = parts;
  return m * 60 + s;
}

function renderAnswer(text: string, seekTo: ((seconds: number) => void) | null) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TIMESTAMP_RE);

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const seconds = parseTimestamp(match[0]);
    parts.push(
      <button
        key={match.index}
        onClick={() => seekTo?.(seconds)}
        className="font-mono text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {match[0]}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

export default function AskTab({ videoId, seekTo }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, question, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
        setLoading(false);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setError("Could not reach the backend. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400/40 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400/70">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-lg p-3 text-sm ${
              m.role === "user"
                ? "self-end bg-black text-white dark:bg-white dark:text-black"
                : "self-start bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {m.role === "assistant" ? renderAnswer(m.text, seekTo) : m.text}
          </div>
        ))}
        {loading && <p className="text-sm text-zinc-500">Thinking...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about this video..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </div>
    </div>
  );
}