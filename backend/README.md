# LandConnect API
1. Setup: `cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt`, then copy `.env.example` to `.env` and fill in values.
2. Run locally: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (tables are created on startup; check `GET /health`).
3. Test: `pytest` (uses a temporary SQLite DB and a stubbed Stream client).
4. Deploy: push to GitHub, then in Render choose New > Blueprint and select this repo (`render.yaml`, root directory `backend`).
5. In Render set `DATABASE_URL`, `JWT_SECRET`, `STREAM_API_KEY`, `STREAM_API_SECRET`, and put the service URL in `mobile/eas.json` as `EXPO_PUBLIC_API_URL`.
