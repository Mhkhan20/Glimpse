"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import YouTubePlayer from "./YouTubePlayer";
import SearchTab from "./SearchTab";
import AskTab from "./AskTab";
import VisualsTab from "./VisualsTab";

type TranscriptLine = {
  text: string;
  start: number;
  duration: number;
};

type Tab = "search" | "ask" | "visuals";

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ask: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  visuals: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const isVertical = useSearchParams().get("vertical") === "1";
  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [error, setError] = useState("");
  const [seekTo, setSeekTo] = useState<((seconds: number) => void) | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("search");

  useEffect(() => {
    fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Something went wrong.");
          return;
        }
        setTranscript(data.transcript);
      })
      .catch(() => setError("Could not reach the backend. Is it running?"));
  }, [videoId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex items-center border-b border-border px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="font-heading text-base font-semibold text-foreground">Glimpse</span>
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 md:flex-row">
        <div className="flex w-full items-center justify-center md:w-2/3">
          <YouTubePlayer videoId={videoId} vertical={isVertical} onReady={(seek) => setSeekTo(() => seek)} />
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 md:w-1/3">
          {error && <p className="text-red-400">{error}</p>}
          {!error && !transcript && <p className="text-muted">Loading transcript...</p>}

          {transcript && (
            <>
              <div className="flex gap-2 border-b border-border">
                {(["search", "ask", "visuals"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-accent text-accent"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {TAB_ICONS[tab]}
                    {tab}
                  </button>
                ))}
              </div>

              <div className={`min-h-0 flex-1 ${activeTab === "search" ? "flex flex-col" : "hidden"}`}>
                <SearchTab
                  videoId={videoId}
                  transcript={transcript}
                  seekTo={seekTo}
                  onGoToVisuals={() => setActiveTab("visuals")}
                />
              </div>
              <div className={`min-h-0 flex-1 ${activeTab === "ask" ? "flex flex-col" : "hidden"}`}>
                <AskTab videoId={videoId} seekTo={seekTo} />
              </div>
              <div className={`min-h-0 flex-1 ${activeTab === "visuals" ? "flex flex-col" : "hidden"}`}>
                <VisualsTab videoId={videoId} seekTo={seekTo} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
