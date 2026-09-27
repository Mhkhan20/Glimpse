"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiLoadPromise;
}

type Props = {
  videoId: string;
  vertical?: boolean;
  onReady: (seekTo: (seconds: number) => void) => void;
};

export default function YouTubePlayer({ videoId, vertical, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        events: {
          onReady: () => {
            onReady((seconds: number) => {
              playerRef.current.seekTo(seconds, true);
              playerRef.current.playVideo();
            });
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className={`${vertical ? "aspect-[9/16]" : "aspect-video"} h-full max-h-[90vh] w-auto max-w-full overflow-hidden rounded-lg`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}