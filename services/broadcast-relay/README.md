# WIGOD Pilot Broadcast Relay

This service is the first external media transport layer for WIGOD.

## Flow

```
WIGOD Pilot page
      │
      │ WebRTC / WHIP
      ▼
MediaMTX :8889
      │
      │ RTSP on localhost
      ▼
FFmpeg
      │
      │ H.264 + AAC / RTMPS
      ▼
YouTube Live
```

The Next.js/Vercel application remains the control UI. MediaMTX + FFmpeg must run on a separate server because persistent WebRTC/media processes are not a good fit for a Vercel request runtime.

MediaMTX supports browser WebRTC publishing and WHIP, and can run hooks that invoke FFmpeg. The current relay uses that pattern. citeturn0search4turn1search4

## 1. Server requirements

Use a Linux VPS or equivalent Docker host with:

- Docker + Docker Compose
- Public HTTPS hostname for the WebRTC endpoint
- UDP 8189 and TCP 8190 reachable for WebRTC ICE
- TCP 8554 available locally to the container
- A valid TLS certificate for the WebRTC hostname

For the first pilot, use one stream at 1280x720 / 30fps and about 3.5 Mbps video.

## 2. YouTube

The pilot intentionally uses a YouTube stream key first rather than building OAuth management into WIGOD on day one.

Set:

```bash
export YOUTUBE_RTMPS_URL='rtmps://YOUR-YOUTUBE-INGEST-HOST/YOUR-APPLICATION/YOUR-STREAM-KEY'
```

Keep the stream key only on the relay server. Do not put it in the Next.js/Vercel environment or browser code.

YouTube supports RTMPS ingestion on port 443 and its Live Streaming API can later create/manage broadcasts and streams through OAuth. citeturn0search3turn0search8

## 3. TLS / reverse proxy

Point a hostname such as `broadcast.example.com` at the VPS and terminate TLS there. Forward HTTPS WHIP requests to MediaMTX port 8889.

The browser URL used by WIGOD should therefore look like:

```
https://broadcast.example.com/wigod-pilot/whip
```

The WebRTC media path itself also needs the MediaMTX ICE ports reachable from the public internet. If direct UDP connectivity is difficult, add a TURN server in the next transport iteration.

## 4. WIGOD environment

Add this to the Vercel project:

```
NEXT_PUBLIC_WIGOD_WHIP_URL=https://broadcast.example.com/wigod-pilot/whip
```

The value is safe to expose because it is an ingest endpoint, not the YouTube credential. The current pilot page is still protected by the existing WIGOD Live administrator gate.

## 5. Start

```bash
cd services/broadcast-relay
export YOUTUBE_RTMPS_URL='rtmps://YOUR-YOUTUBE-INGEST-HOST/YOUR-APPLICATION/YOUR-STREAM-KEY'
docker compose up -d
```

Then open:

```
/live/pilot
```

inside the WIGOD application.

## 6. Pilot acceptance test

1. Camera preview appears.
2. Microphone is active.
3. Start Pilot creates the WHIP session.
4. MediaMTX receives the WebRTC stream.
5. FFmpeg converts it to H.264/AAC.
6. YouTube receives the RTMPS feed.
7. YouTube shows the stream as healthy/live.
8. Stop Pilot tears down the WHIP resource and relay process.

After this passes, the next code layer is the **WIGOD Broadcast Canvas**: camera/screen/media/background/logo/lower-third/headline/ticker are composited into one outgoing program feed. Facebook can then be added as another server-side destination rather than changing the creator workflow.

YouTube requires both video and audio for the stream; the relay therefore treats camera + microphone as the minimum pilot input. citeturn3search2
