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

const EXAMPLE_PROMPTS = [
  "What is this video about?",
  "Summarize the key points",
  "What's shown but not said out loud?",
];

const TIMESTAMP_RE = /\[(\d{1,2}:)?\d{1,2}:\d{2}(\s*[–-]\s*(\d{1,2}:)?\d{1,2}:\d{2})?\]/g;

function parseTimestamp(raw: string): number {
  const inner = raw.replace(/[[\]]/g, "");
  const first = inner.split(/[–-]/)[0].trim();
  const parts = first.split(":").map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  const [m, s] = parts;
  return m * 60 + s;
}

function renderAnswer(rawText: string, seekTo: ((seconds: number) => void) | null) {
  const text = rawText.replace(/\*\*/g, "");
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
        className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-sm font-medium text-accent"
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

  async function handleSend(questionOverride?: string) {
    const question = (questionOverride ?? input).trim();
    if (!question || loading) return;
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(154,154,158,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted/70">
        {messages.length === 0 && !loading && !error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask anything about this video</p>
              <p className="text-xs text-muted">Every answer comes with clickable timestamps.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-xl p-3 text-sm ${
              m.role === "user"
                ? "self-end bg-accent text-background"
                : "self-start border border-border bg-surface text-foreground"
            }`}
          >
            {m.role === "assistant" ? renderAnswer(m.text, seekTo) : m.text}
          </div>
        ))}
        {loading && <p className="text-sm text-muted">Thinking...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about this video..."
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
