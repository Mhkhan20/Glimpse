# Glimpse

Ctrl+F for video. Paste a YouTube link and search, ask, or scan what's shown on screen.

## Project structure

- `frontend/` — Next.js (TypeScript, Tailwind) app, runs on http://localhost:3000
- `backend/` — FastAPI app, runs on http://localhost:8000

## Setup (first time only)

### Backend

```
cd /d C:\Dev\Glimpse\backend
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend\.env` with your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

### Frontend

```
cd /d C:\Dev\Glimpse\frontend
npm install
```

## Running the app

Open two cmd windows.

**Backend terminal:**

```
cd /d C:\Dev\Glimpse\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Frontend terminal:**

```
cd /d C:\Dev\Glimpse\frontend
npm run dev
```

Then open http://localhost:3000 in your browser. It should say "Backend says: ok".
