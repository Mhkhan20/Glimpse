"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
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
    <div className="flex h-screen flex-col gap-6 overflow-hidden p-6 md:flex-row">
      <div className="w-full md:w-2/3">
        <YouTubePlayer videoId={videoId} onReady={(seek) => setSeekTo(() => seek)} />
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 md:w-1/3">
        {error && <p className="text-red-500">{error}</p>}
        {!error && !transcript && <p>Loading transcript...</p>}

        {transcript && (
          <>
            <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
              {(["search", "ask", "visuals"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-black dark:border-white"
                      : "text-zinc-500"
                  }`}
                >
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
  );
}
