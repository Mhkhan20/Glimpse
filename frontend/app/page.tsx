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
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4">
      <main className="flex flex-col items-center gap-6 text-center w-full max-w-xl">
        <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Glimpse
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Ctrl+F for video
        </p>
        <div className="flex w-full gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link"
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="rounded-lg bg-black px-6 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {error && <p className="text-red-500">{error}</p>}
      </main>
    </div>
  );
}