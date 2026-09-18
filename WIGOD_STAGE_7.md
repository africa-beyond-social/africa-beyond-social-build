# Stage 7 — WIGOD Real Live Viewing

Stage 7 adds the first real native WIGOD Live transport layer.

Implemented:

- Real-time WIGOD Live transport through LiveKit.
- Server-side short-lived LiveKit access tokens.
- Admin-only publisher access.
- Public subscribe-only viewer access.
- Native WIGOD Live session creation and stop lifecycle.
- Public shareable Live room at `/live/[room]`.
- Live discovery inside the WIGOD Live Centre.
- Automatic native live status polling.
- Viewer connection and basic audience count.
- YouTube remains an optional publishing connection.

## Architecture

```
WIGOD Live Studio
  Camera / Screen + Microphone
          |
          v
   LiveKit media server
          |
          v
  Public WIGOD Live Room
```

The Studio currently publishes the active camera or screen stream and microphone. Studio graphics remain part of the browser preview; compositing those graphics into the outgoing media stream is a later production layer.

## Required production configuration

Set these server-side Vercel environment variables:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Keep the API secret out of the browser and source control.

The current implementation uses the LiveKit JavaScript UMD build from jsDelivr so the project does not need a new package dependency just to activate the transport layer.

## Next engineering layer

- Broadcast title/description controls connected to the live session.
- Canvas/media compositing so lower thirds, tickers, logos and scenes are included in the transmitted programme.
- Automatic cleanup/heartbeat when a broadcaster disconnects unexpectedly.
- Optional YouTube publishing from the same WIGOD broadcast.
