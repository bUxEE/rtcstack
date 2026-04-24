# RTCstack Playground

Two self-contained HTML files for manually testing a live video call end-to-end against the local Docker stack. No build step — open directly in a browser.

## Prerequisites

The Docker stack must be running:

```bash
cd docker
docker compose up -d
```

Verify it's healthy before opening the pages:

```bash
curl http://localhost:3246/v1/health
# → {"status":"ok","version":"0.1.0",...}
```

## Files

| File | Default name | Default role |
|---|---|---|
| `alice.html` | Alice | Host |
| `bob.html` | Bob | Participant |

Both files hardcode the credentials from `docker/.env` and connect to LiveKit directly on `ws://localhost:3242` (bypasses Caddy to avoid self-signed TLS issues in local dev).

## How to open

### Option A — file:// (simplest)

Open each file directly in a browser tab:

- `File > Open File` → `alice.html`
- Open a second window/tab → `bob.html`

Some browsers (Firefox, Chrome) block `fetch()` to `localhost` from a `file://` origin. If you see a CORS or network error in the join screen, use Option B.

### Option B — local static server (recommended)

```bash
cd apps/playground
npx serve .
```

Then open in two separate windows:

```
http://localhost:3000/alice.html
http://localhost:3000/bob.html
```

Any static server works (`python3 -m http.server 3000`, VS Code Live Server, etc.).

## Running a test

1. Open `alice.html` and `bob.html` side by side.
2. Click **Join Room** in both windows (room defaults to `test-room`).
3. Grant camera and microphone permissions when the browser prompts.
4. Each participant's video tile appears in the other's window once the track is subscribed.

You can edit the **Room ID**, **Display name**, and **Role** fields before joining. Both files pre-fill different values so you can join the same room without changing anything.

## Controls

| Button | Action |
|---|---|
| Mute mic / Unmute mic | Toggle local microphone |
| Stop cam / Start cam | Toggle local camera |
| Leave | Disconnect from the room |

The connection state (`connected`, `reconnecting`, etc.) is shown in the bottom bar between the controls.

## Changing the room

Type any room name in the **Room ID** field. The page calls `POST /v1/rooms` to create it if it does not already exist before requesting a token, so you do not need to pre-create rooms.

## Credentials

The API key, secret, and LiveKit URL are hardcoded at the top of each `<script>` block from the values generated in `docker/.env` at stack init time. If you regenerate `.env` (e.g. after `docker compose down -v` and a fresh start), update these three constants in both files:

```js
const API_KEY    = '...'
const API_SECRET = '...'
const LK_URL_OVERRIDE = 'ws://localhost:3242'
```

## How signing works

Every request (except `/v1/health`) is signed with HMAC-SHA256. The canonical string is:

```
METHOD\nPATH\nUNIX_TIMESTAMP\nBODY_HASH
```

`BODY_HASH` is always the HMAC-SHA256 of an empty string (the server runs auth on `onRequest`, before Fastify parses the body, so `req.body` is always undefined at signing time).

Headers sent on each request:

| Header | Value |
|---|---|
| `X-Api-Key` | API key |
| `X-RTCstack-Timestamp` | Unix seconds (integer string) |
| `X-RTCstack-Signature` | `sha256=<hex>` |

Requests older than 300 seconds are rejected by the server (replay protection).
