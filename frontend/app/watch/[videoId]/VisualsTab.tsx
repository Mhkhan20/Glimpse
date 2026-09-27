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
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-600">
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
        <button
          onClick={startScan}
          className="w-fit rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Scan visuals
        </button>
      )}

      {status.status === "running" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Scanning... {status.done} / {status.total || "?"}
          </p>
          <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-black dark:bg-white"
              style={{ width: status.total ? `${(status.done / status.total) * 100}%` : "10%" }}
            />
          </div>
        </div>
      )}

      {status.status === "error" && (
        <p className="text-sm text-red-500">Scan failed: {status.error}</p>
      )}

      {status.status === "done" && (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search what's shown on screen..."
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400/40 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400/70">
            {filtered.map((f, i) => (
              <button
                key={i}
                onClick={() => seekTo?.(f.timestamp)}
                className="flex gap-3 rounded-lg border border-zinc-200 p-2 text-left hover:border-black dark:border-zinc-800 dark:hover:border-white"
              >
                <img
                  src={`http://localhost:8000/data/${videoId}/frames/${f.file}`}
                  alt=""
                  className="h-16 w-28 flex-shrink-0 rounded object-cover"
                />
                             <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                    {formatTime(f.timestamp)}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {highlightWords(f.description, queryWords)}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-zinc-500">No matching frames found.</p>}
          </div>
        </>
      )}
    </div>
  );
}