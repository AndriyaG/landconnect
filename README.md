# LandConnect

Android prototype of a land marketplace. Buyers browse listings. Sellers and brokers publish them. People chat in the app, place audio and video calls, and join scheduled meeting rooms.

This is a demo, not a store release. There is no iOS build and no push notifications.

## Features

- Register and log in as a buyer, seller, or broker. There is no admin role.
- Sellers and brokers create, edit, and delete listings. Buyers cannot.
- Search listings by text and price. The map shows active listings in the current area.
- Each listing has a price, area, land type, address, map pin, and photos.
- Chat is tied to a listing. Messages go over a WebSocket and are stored in the database.
- Audio and video calls, plus multi-person meeting rooms, use Stream Video. The API creates every call.
- A user can block another user. A block stops new messages, calls, and meeting invites in both directions.
- Profile settings choose who may call you: everyone, or only people you already have a conversation with.
- Phone numbers typed in chat are stored with all but the last two digits replaced.

## Tech stack

| Part | Choice |
| --- | --- |
| Mobile | Expo SDK 58, React Native, TypeScript, expo-router, Zustand, TanStack Query, axios |
| API | FastAPI, SQLAlchemy 2, Pydantic, JWT (HS256), bcrypt |
| Database | PostgreSQL in production. Tests can use SQLite. |
| Calls | Stream Video (`getstream` on the server, `@stream-io/video-react-native-sdk` on the phone) |
| Chat | FastAPI WebSocket at `/ws` |
| Maps | Leaflet and OpenStreetMap tiles inside a WebView |
| Images | JPEG bytes in PostgreSQL, served by `GET /images/{id}` |
| Hosting | Render web service. The phone talks to `EXPO_PUBLIC_API_URL`. |

## Setup

### Backend

From `backend`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set the four variables below. Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created on startup. `GET /health` returns `{"status": "ok"}`.

### Hosted Postgres

Use a hosted Postgres database and put its URL in `DATABASE_URL`. Include `sslmode=require` if the host requires TLS. The app rewrites `postgres://` and `postgresql://` to `postgresql+psycopg2://` for SQLAlchemy. `render.yaml` does not create the database. Set `DATABASE_URL` on the Render service yourself.

### Stream

Create a Stream Video app and set `STREAM_API_KEY` and `STREAM_API_SECRET`.

In the Stream dashboard, open Video & Audio, Call Types, `default`, Permissions. Remove `CreateCall`, `UpdateCall`, and `UpdateCallMember` from the `user` role. Keep `JoinCall`, `ReadCall`, `SendAudio`, `SendVideo`, and `EndCall` on `call_member`. The mobile SDK then cannot create or ring a call. The backend uses the API secret, which bypasses those grants.

### Render

`render.yaml` defines one Python web service, `landconnect-api`, with root directory `backend`.

1. Push this repo to GitHub.
2. In Render, choose New, Blueprint, and select the repo.
3. Set `DATABASE_URL`, `JWT_SECRET`, `STREAM_API_KEY`, and `STREAM_API_SECRET`.
4. The start command is `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. The health check is `/health`.

The deployed API used by the mobile builds is `https://landconnect-zqhr.onrender.com/`.

A free Render web service sleeps when idle. Open `/health` and wait until it returns `ok` before a demo.

### Mobile

Android only. Package name `com.landconnect.app`. Minimum SDK 24. Calls use WebRTC, so the app does not run in Expo Go. Use an EAS development or preview APK.

From `mobile`:

```bash
npm install
```

Local Metro reads `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://landconnect-zqhr.onrender.com/
```

EAS cloud builds do not read that file. Both the `development` and `preview` profiles in `eas.json` set `EXPO_PUBLIC_API_URL` to the Render URL. Change it there when the API URL changes, then rebuild.

Development APK (loads JavaScript from Metro):

```bash
eas build --platform android --profile development
npm start
```

`npm start` runs `expo start --dev-client`. Install the development APK, then open the project from that app while Metro is running. The phone must be able to reach Metro and the API.

Preview APK (JavaScript is bundled; no Metro):

```bash
eas build --platform android --profile preview
```

Install that APK on each demo phone. This is the build to use for the script in `DEMO.md`.

### Environment variables

Backend (`.env`, and the same keys on Render):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs access tokens. Tokens last 7 days. |
| `STREAM_API_KEY` | Stream app key, returned to the phone with a user token |
| `STREAM_API_SECRET` | Server-only. Creates calls and signs Stream tokens. |

Tests read `TEST_DATABASE_URL` when it is set. Otherwise they use a temporary SQLite file. Do not point `TEST_DATABASE_URL` at a database you care about. Every test drops all tables.

Mobile:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL of the API, including the trailing slash used in `eas.json` |

Stream keys stay on the server. The phone receives a short-lived Stream user token from `POST /calls/token`.

## Demo accounts

Seed against the database in `.env`:

```bash
python -m app.seed
```

This is safe to run again. It creates three users, all with password `landconnect123`:

| Email | Role |
| --- | --- |
| `demo.buyer@example.com` | buyer |
| `demo.seller@example.com` | seller |
| `demo.broker@example.com` | broker |

It also creates eight listings around Bengaluru. Photos are external `https://picsum.photos` URLs. Run the seed on the hosted database if you want these accounts on the Render API. The demo script in `DEMO.md` registers new users instead.

## Tests

From `backend`, with the virtualenv active:

```bash
pytest
```

Stream is stubbed. One test signs a Stream JWT locally with the test secret and does not call Stream. See `TECH_DECISIONS.md` for what the suite covers, and `DEMO.md` for the two-phone check.
