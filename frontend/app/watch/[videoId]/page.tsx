"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TranscriptLine = {
  text: string;
  start: number;
  duration: number;
};

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [transcript, setTranscript] = useState<TranscriptLine[] | null>(null);
  const [error, setError] = useState("");

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
    <div className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
      <div className="aspect-video w-full md:w-2/3">
        <iframe
          className="h-full w-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="w-full md:w-1/3">
        {error && <p className="text-red-500">{error}</p>}
        {!error && !transcript && <p>Loading transcript...</p>}
        {transcript && (
          <p>
            Transcript loaded: {transcript.length} lines. Search, Ask, and
            Visuals tabs are coming in the next steps.
          </p>
        )}
      </div>
    </div>
  );
}