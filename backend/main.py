import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

from video_utils import extract_video_id

app = FastAPI(title="Glimpse Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"


class AnalyzeRequest(BaseModel):
    url: str


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
        raise HTTPException(status_code=404, detail="No transcript is available for this video.")

    video_dir.mkdir(parents=True, exist_ok=True)
    transcript_path.write_text(json.dumps(transcript, indent=2), encoding="utf-8")

    return {"video_id": video_id, "transcript": transcript}