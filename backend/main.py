import json
import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google import genai
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

from video_utils import extract_video_id
from visual_pipeline import extract_and_dedupe
from visual_descriptions import describe_all_frames

load_dotenv()

app = FastAPI(title="Glimpse Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


class AnalyzeRequest(BaseModel):
    url: str


class ChatTurn(BaseModel):
    role: str  # "user" or "assistant"
    text: str


class AskRequest(BaseModel):
    video_id: str
    question: str
    history: list[ChatTurn] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="That doesn't look like a valid YouTube link.")

    video_dir = DATA_DIR / video_id
    transcript_path = video_dir / "transcript.json"

    if transcript_path.exists():
        transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
        return {"video_id": video_id, "transcript": transcript}

    try:
        fetched = YouTubeTranscriptApi().fetch(video_id)
        transcript = fetched.to_raw_data()
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable):
        transcript = []

    video_dir.mkdir(parents=True, exist_ok=True)
    transcript_path.write_text(json.dumps(transcript, indent=2), encoding="utf-8")

    return {"video_id": video_id, "transcript": transcript}


def format_timestamp(seconds: float) -> str:
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def build_transcript_text(transcript: list[dict], question: str) -> str:
    total_duration = transcript[-1]["start"] + transcript[-1]["duration"] if transcript else 0

    if total_duration < 3600:
        lines = transcript
    else:
        question_words = set(question.lower().split())
        scored = [
            (sum(1 for w in question_words if w in line["text"].lower()), i, line)
            for i, line in enumerate(transcript)
        ]
        scored.sort(key=lambda x: x[0], reverse=True)
        top = sorted(scored[:150], key=lambda x: x[1])
        lines = [line for _, _, line in top]

    return "\n".join(f"[{format_timestamp(line['start'])}] {line['text']}" for line in lines)


@app.post("/ask")
def ask(req: AskRequest):
    transcript_path = DATA_DIR / req.video_id / "transcript.json"
    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail="Analyze this video first.")

    transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    if not transcript:
        return {
            "answer": "This video doesn't have a transcript, so I can't answer questions about what was said. Try the Visuals tab to see what's shown on screen instead."
        }

    transcript_text = build_transcript_text(transcript, req.question)

    history_text = "\n".join(f"{turn.role}: {turn.text}" for turn in req.history[-6:])

    prompt = f"""You are answering questions about a YouTube video using only its transcript below.
Always cite timestamps for claims, formatted exactly like [mm:ss] or [h:mm:ss], matching the transcript's own timestamps.
Cite exactly ONE timestamp per bracket. Never combine two timestamps in one bracket and never write a range like [1:23-1:26]. If a claim is supported by multiple moments, cite each one in its own bracket, like [1:23] [1:26].
Do not use markdown formatting such as ** for bold or * for bullets — reply in plain text only.
If the question asks for YOUR opinion, judgment, or evaluation (e.g. "do you think...", "is this a good...", "would you recommend..."), you must form and state your own view — do not say the transcript doesn't contain an opinion, since the transcript is source material, not something being asked for its opinion. Start with a direct stance like "In my view, ..." or "Yes/No, ...", then back it up with evidence and timestamps from the transcript.
Only say the video doesn't answer the question when it's a factual question the transcript genuinely has no information about — not for opinion questions, which you should always answer yourself using the transcript as evidence.

Transcript:
{transcript_text}

Recent conversation:
{history_text}

Question: {req.question}
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    return {"answer": response.text}


scan_progress: dict[str, dict] = {}


def run_scan(video_id: str):
    scan_progress[video_id] = {"status": "running", "done": 0, "total": 0}
    try:
        meta = extract_and_dedupe(video_id)
        scan_progress[video_id]["total"] = len(meta)

        def on_progress(done, total):
            scan_progress[video_id].update({"done": done, "total": total})

        frames = describe_all_frames(video_id, on_progress=on_progress)
        scan_progress[video_id] = {"status": "done", "done": len(frames), "total": len(frames)}
    except Exception as e:
        scan_progress[video_id] = {"status": "error", "error": str(e)}


@app.post("/scan/{video_id}")
def start_scan(video_id: str):
    frames_path = DATA_DIR / video_id / "frames.json"
    if frames_path.exists():
        return {"status": "done"}

    if scan_progress.get(video_id, {}).get("status") == "running":
        return {"status": "running"}

    threading.Thread(target=run_scan, args=(video_id,), daemon=True).start()
    return {"status": "started"}


@app.get("/scan/{video_id}/status")
def scan_status(video_id: str):
    frames_path = DATA_DIR / video_id / "frames.json"
    if frames_path.exists():
        frames = json.loads(frames_path.read_text(encoding="utf-8"))
        return {"status": "done", "done": len(frames), "total": len(frames), "frames": frames}

    return scan_progress.get(video_id, {"status": "not_started", "done": 0, "total": 0})