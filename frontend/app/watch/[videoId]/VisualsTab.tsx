"use client";

import { useEffect, useRef, useState } from "react";

type Frame = {
  timestamp: number;
  file: string;
  description: string;
};

type ScanStatus = {
  status: "not_started" | "running" | "done" | "error";
  done: number;
  total: number;
  frames?: Frame[];
  error?: string;
};

type Props = {
  videoId: string;
  seekTo: ((seconds: number) => void) | null;
};

function highlightWords(text: string, words: string[]) {
  if (words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const segments = text.split(pattern);
  return segments.map((segment, i) =>
    words.some((w) => segment.toLowerCase() === w.toLowerCase()) ? (
      <mark key={i} className="rounded bg-accent/30 text-foreground">
        {segment}
      </mark>
    ) : (
      segment
    )
  );
}

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VisualsTab({ videoId, seekTo }: Props) {
  const [status, setStatus] = useState<ScanStatus>({ status: "not_started", done: 0, total: 0 });
  const [query, setQuery] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchStatus() {
    fetch(`http://localhost:8000/scan/${videoId}/status`)
      .then((res) => res.json())
      .then((data: ScanStatus) => {
        setStatus(data);
        if (data.status === "done" || data.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      });
  }

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  function startScan() {
    fetch(`http://localhost:8000/scan/${videoId}`, { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        fetchStatus();
        pollRef.current = setInterval(fetchStatus, 2000);
      });
  }

  const frames = status.frames || [];
  const queryWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = queryWords.length
    ? frames.filter((f) => {
        const text = f.description.toLowerCase();
        return queryWords.every((word) => text.includes(word));
      })
    : frames;

  return (
    <div className="flex h-full flex-col gap-4">
      {status.status === "not_started" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Scan what&#39;s shown on screen</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {["People", "Objects", "Text", "Charts"].map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted">
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={startScan}
            className="mt-1 w-fit rounded-xl bg-accent px-4 py-2 text-sm font-medium text-background"
          >
            Scan visuals
          </button>
        </div>
      )}

      {status.status === "running" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="text-sm text-muted">
              {status.total
                ? `Scanning video... ${status.done} / ${status.total} frames processed`
                : "Downloading video and extracting frames..."}
            </p>
          </div>
          {status.total > 0 && (
            <div className="h-2 w-full overflow-hidden rounded bg-surface-2">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${(status.done / status.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status.status === "error" && (
        <p className="text-sm text-red-400">Scan failed: {status.error}</p>
      )}

      {status.status === "done" && (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search what's shown on screen..."
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-faint focus:outline-none"
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(154,154,158,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted/70">
            {filtered.map((f, i) => (
              <button
                key={i}
                onClick={() => seekTo?.(f.timestamp)}
                className="flex gap-3 rounded-xl border border-border bg-surface p-2 text-left transition-colors hover:border-accent"
              >
                <img
                  src={`http://localhost:8000/data/${videoId}/frames/${f.file}`}
                  alt=""
                  className="h-16 w-28 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-medium text-accent">
                    {formatTime(f.timestamp)}
                  </span>
                  <span className="text-xs text-muted">
                    {highlightWords(f.description, queryWords)}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted">No matching frames found.</p>}
          </div>
        </>
      )}
    </div>
  );
}
