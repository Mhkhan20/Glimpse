import json
import subprocess
from pathlib import Path

import imagehash
import yt_dlp
from PIL import Image

DATA_DIR = Path(__file__).parent / "data"
DEDUPE_THRESHOLD = 6  # hamming distance; higher = more tolerant of similar frames
MAX_FRAMES = 200


def download_video(video_id: str) -> tuple[Path, float]:
    video_dir = DATA_DIR / video_id
    video_dir.mkdir(parents=True, exist_ok=True)
    info_path = video_dir / "video_info.json"

    existing = list(video_dir.glob("video.*"))
    if existing and info_path.exists():
        info = json.loads(info_path.read_text(encoding="utf-8"))
        return existing[0], info["duration"]

    ydl_opts = {
        "format": "bestvideo[height<=360]/bestvideo/best[height<=480]/best",
        "outtmpl": str(video_dir / "video.%(ext)s"),
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)

    duration = info.get("duration", 0)
    info_path.write_text(json.dumps({"duration": duration}), encoding="utf-8")
    video_path = next(video_dir.glob("video.*"))
    return video_path, duration


def extract_frames(video_path: Path, out_dir: Path, duration: float) -> list[tuple[float, Path]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    interval = 3 if duration < 1800 else 10

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(video_path), "-vf", f"fps=1/{interval}",
         "-q:v", "2", str(out_dir / "frame_%05d.jpg")],
        capture_output=True, check=True,
    )

    frames = []
    for i, path in enumerate(sorted(out_dir.glob("frame_*.jpg"))):
        frames.append((i * interval, path))
    return frames


def dedupe_frames(frames: list[tuple[float, Path]]) -> list[tuple[float, Path]]:
    kept = []
    last_hash = None

    for timestamp, path in frames:
        h = imagehash.phash(Image.open(path))
        if last_hash is None or (h - last_hash) > DEDUPE_THRESHOLD:
            kept.append((timestamp, path))
            last_hash = h
        else:
            path.unlink()

    return kept


def cap_frames(frames: list[tuple[float, Path]], max_count: int = MAX_FRAMES) -> list[tuple[float, Path]]:
    if len(frames) <= max_count:
        return frames

    step = len(frames) / max_count
    selected_indices = {int(i * step) for i in range(max_count)}
    kept, dropped = [], []
    for i, item in enumerate(frames):
        (kept if i in selected_indices else dropped).append(item)

    for _, path in dropped:
        path.unlink()

    return kept


def extract_and_dedupe(video_id: str) -> list[dict]:
    video_dir = DATA_DIR / video_id
    meta_path = video_dir / "frames_meta.json"

    if meta_path.exists():
        return json.loads(meta_path.read_text(encoding="utf-8"))

    video_path, duration = download_video(video_id)

    frames_dir = video_dir / "frames"
    frames = extract_frames(video_path, frames_dir, duration)
    frames = dedupe_frames(frames)
    frames = cap_frames(frames)

    meta = [{"timestamp": t, "file": p.name} for t, p in frames]
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta