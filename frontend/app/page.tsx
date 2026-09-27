"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleAnalyze() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
        setLoading(false);
        return;
      }
      const isShort = /\/shorts\//.test(url);
      router.push(`/watch/${data.video_id}${isShort ? "?vertical=1" : ""}`);
    } catch {
      setError("Could not reach the backend. Is it running?");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="font-heading text-6xl font-bold tracking-tight text-foreground">
            Glimpse
          </h1>
          <p className="text-lg text-muted">Every word. Every frame. Searchable.</p>
        </div>

        <div className="flex w-full gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-faint">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube link"
              className="w-full bg-transparent py-3 text-foreground placeholder:text-faint focus:outline-none"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="rounded-xl bg-accent px-6 py-3 font-medium text-background disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {error && <p className="text-red-400">{error}</p>}

        <div className="mt-6 flex gap-4">
          <div className="flex w-[190px] flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-foreground">Search</div>
            <div className="text-xs leading-relaxed text-muted">Jump to any word said out loud.</div>
          </div>

          <div className="flex w-[190px] flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-foreground">Ask</div>
            <div className="text-xs leading-relaxed text-muted">Chat with the video, every answer cited.</div>
          </div>

          <div className="flex w-[190px] flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-foreground">Visuals</div>
            <div className="text-xs leading-relaxed text-muted">Find what&#39;s shown, not just said.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
