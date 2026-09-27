"use client";

import { useMemo, useState } from "react";

type TranscriptLine = {
  text: string;
  start: number;
  duration: number;
};

type SearchResult = {
  start: number;
  text: string;
};

type Props = {
  videoId: string;
  transcript: TranscriptLine[];
  seekTo: ((seconds: number) => void) | null;
  onGoToVisuals: () => void;
};

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function search(transcript: TranscriptLine[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const matchedSingle = new Set<number>();

  transcript.forEach((line, i) => {
    if (line.text.toLowerCase().includes(q)) {
      matchedSingle.add(i);
      results.push({ start: line.start, text: line.text });
    }
  });

  for (let i = 0; i < transcript.length - 1; i++) {
    if (matchedSingle.has(i) || matchedSingle.has(i + 1)) continue;
    const joined = `${transcript[i].text} ${transcript[i + 1].text}`;
    if (joined.toLowerCase().includes(q)) {
      results.push({ start: transcript[i].start, text: joined });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim();
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let start = 0;
  let idx = lower.indexOf(lowerQ, start);

  while (idx !== -1) {
    parts.push(text.slice(start, idx));
    parts.push(
      <mark key={idx} className="bg-yellow-300 dark:bg-yellow-600">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    start = idx + q.length;
    idx = lower.indexOf(lowerQ, start);
  }
  parts.push(text.slice(start));
  return parts;
}

export default function SearchTab({ videoId, transcript, seekTo, onGoToVisuals }: Props) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const results = useMemo(() => search(transcript, query), [transcript, query]);

  function goTo(index: number) {
    if (results.length === 0) return;
    const wrapped = ((index % results.length) + results.length) % results.length;
    setCurrentIndex(wrapped);
    seekTo?.(results[wrapped].start);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCurrentIndex(0);
        }}
        placeholder="Search the transcript..."
        className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />

      {query.trim() && results.length > 0 && (
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <button onClick={() => goTo(currentIndex - 1)} className="rounded border px-2 py-1 dark:border-zinc-700">
            Prev
          </button>
          <span>
            {currentIndex + 1} of {results.length}
          </span>
          <button onClick={() => goTo(currentIndex + 1)} className="rounded border px-2 py-1 dark:border-zinc-700">
            Next
          </button>
        </div>
      )}

      {transcript.length === 0 && (
        <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>This video doesn&apos;t have a transcript, so there&apos;s nothing to search here.</p>
          <button
            onClick={onGoToVisuals}
            className="w-fit rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Go to Visuals
          </button>
        </div>
      )}

      {transcript.length > 0 && query.trim() && results.length === 0 && (
        <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>Not found in what was said. Search what&apos;s shown on screen?</p>
          <button
            onClick={onGoToVisuals}
            className="w-fit rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Go to Visuals
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.4)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400/40 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400/70">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 rounded-lg border p-3 ${
              i === currentIndex ? "border-black dark:border-white" : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo(i)}
                className="font-mono text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {formatTime(r.start)}
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(r.start)}s`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:underline"
              >
                Open in YouTube
              </a>
            </div>
            <p className="text-sm">{highlight(r.text, query)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}