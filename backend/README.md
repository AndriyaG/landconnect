# LandConnect API
1. Setup: `cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt`, then copy `.env.example` to `.env` and fill in values.
2. Run locally: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (tables are created on startup; check `GET /health`).
3. Test: `pytest` (uses `TEST_DATABASE_URL` if set, otherwise a temporary SQLite DB; Stream is stubbed). The test DB is wiped on every test, so never point it at real data.
4. Seed demo data: `python -m app.seed` (uses `DATABASE_URL` from `.env`; safe to rerun). Creates 8 listings around Bengaluru with picsum.photos images. Demo logins, all with password `landconnect123`: `demo.buyer@example.com` (buyer), `demo.seller@example.com` (seller), `demo.broker@example.com` (broker).
5. Listing images: `POST /listings/{id}/images` accepts JPEG/PNG/WebP up to 5 MB. Images are resized to a max of 1600px, re-encoded as JPEG, stored in the `stored_images` table and served from `GET /images/{id}`. Image URLs in responses are either relative (`/images/{id}`, prefix with the API URL) or external `https://` URLs.
6. Deploy: push to GitHub, then in Render choose New > Blueprint and select this repo (`render.yaml`, root directory `backend`).
7. In Render set `DATABASE_URL`, `JWT_SECRET`, `STREAM_API_KEY`, `STREAM_API_SECRET`, and put the service URL in `mobile/eas.json` as `EXPO_PUBLIC_API_URL`.
