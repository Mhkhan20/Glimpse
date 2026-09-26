"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setStatus(`Backend says: ${data.status}`))
      .catch(() => setStatus("Backend not reachable"));
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Glimpse
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Ctrl+F for video
        </p>
        <p className="text-base text-zinc-500 dark:text-zinc-500">{status}</p>
      </main>
    </div>
  );
}
