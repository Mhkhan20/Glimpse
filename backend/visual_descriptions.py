import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError
from PIL import Image

load_dotenv()

DATA_DIR = Path(__file__).parent / "data"
BATCH_SIZE = 12

gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def describe_batch(video_dir: Path, batch: list[dict]) -> list[str]:
    images = [Image.open(video_dir / "frames" / f["file"]) for f in batch]

    instructions = f"""You are describing frames extracted from a video, in order.
For each of the {len(batch)} frames below, write one description covering: any people and what they're doing, objects (including their color, material, and shape), charts or diagrams, and ALL visible on-screen text (transcribe it exactly).
Always mention the color of notable objects and tools when visible — this detail matters for search.
Return ONLY a JSON array of {len(batch)} strings, one per frame, in the same order as the frames were given. No other text, no markdown."""

    contents = [instructions, *images]

    last_error = None
    for attempt in range(3):
        try:
            response = gemini_client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=contents,
            )
            text = response.text.strip()
            if text.startswith("```"):
                text = text.strip("`").removeprefix("json").strip()
            descriptions = json.loads(text)
            if len(descriptions) != len(batch):
                raise ValueError(f"Expected {len(batch)} descriptions, got {len(descriptions)}")
            return descriptions
        except ServerError as e:
            last_error = e
            if attempt < 2:
                time.sleep(2)

    raise last_error


def describe_all_frames(video_id: str, on_progress=None) -> list[dict]:
    video_dir = DATA_DIR / video_id
    frames_path = video_dir / "frames.json"

    if frames_path.exists():
        return json.loads(frames_path.read_text(encoding="utf-8"))

    meta = json.loads((video_dir / "frames_meta.json").read_text(encoding="utf-8"))

    results = []
    for i in range(0, len(meta), BATCH_SIZE):
        batch = meta[i:i + BATCH_SIZE]
        descriptions = describe_batch(video_dir, batch)
        for frame, description in zip(batch, descriptions):
            results.append({
                "timestamp": frame["timestamp"],
                "file": frame["file"],
                "description": description,
            })
        if on_progress:
            on_progress(len(results), len(meta))

    frames_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    return results