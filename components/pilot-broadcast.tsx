"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Mic, MicOff, Radio, Square, Wifi, WifiOff } from "lucide-react"

type State = "idle" | "preview" | "connecting" | "live" | "error"

const WHIP_URL = process.env.NEXT_PUBLIC_WIGOD_WHIP_URL || ""

function waitForIceGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 4000)
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        window.clearTimeout(timeout)
        pc.removeEventListener("icegatheringstatechange", check)
        resolve()
      }
    }
    pc.addEventListener("icegatheringstatechange", check)
  })
}

export function PilotBroadcast() {
  const previewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const resourceUrlRef = useRef("")
  const [state, setState] = useState<State>("idle")
  const [camera, setCamera] = useState(true)
  const [mic, setMic] = useState(true)
  const [title, setTitle] = useState("Africa & Beyond TV — Pilot Broadcast")
  const [error, setError] = useState("")

  useEffect(() => {
    return () => {
      void stopBroadcast()
    }
  }, [])

  async function preview() {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      stream.getVideoTracks().forEach((track) => { track.enabled = camera })
      stream.getAudioTracks().forEach((track) => { track.enabled = mic })
      streamRef.current = stream
      if (previewRef.current) {
        previewRef.current.srcObject = stream
        previewRef.current.muted = true
        await previewRef.current.play()
      }
      setState("preview")
    } catch {
      setError("Camera/microphone access was not available. Check the browser permissions and try again.")
      setState("error")
    }
  }

  function setCameraEnabled(enabled: boolean) {
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled })
    setCamera(enabled)
  }

  function setMicEnabled(enabled: boolean) {
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled })
    setMic(enabled)
  }

  async function startBroadcast() {
    setError("")
    if (!WHIP_URL) {
      setError("The pilot ingest URL is not configured. Add NEXT_PUBLIC_WIGOD_WHIP_URL to the WIGOD deployment.")
      return
    }

    let stream = streamRef.current
    if (!stream) {
      await preview()
      stream = streamRef.current
    }
    if (!stream) return
    if (!stream.getVideoTracks().some((track) => track.enabled)) {
      setError("Turn the camera on before starting the pilot broadcast.")
      return
    }
    if (!stream.getAudioTracks().some((track) => track.enabled)) {
      setError("Turn the microphone on before starting the pilot broadcast.")
      return
    }

    try {
      setState("connecting")
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setError("The broadcast transport connection was interrupted.")
          setState("error")
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)

      const localDescription = pc.localDescription
      if (!localDescription?.sdp) throw new Error("No WebRTC offer was produced.")

      const response = await fetch(WHIP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: localDescription.sdp,
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        throw new Error(detail || `WHIP server returned HTTP ${response.status}.`)
      }

      const answer = await response.text()
      const location = response.headers.get("Location")
      await pc.setRemoteDescription({ type: "answer", sdp: answer })
      resourceUrlRef.current = location ? new URL(location, WHIP_URL).toString() : ""

      setState("live")
    } catch (cause) {
      await stopBroadcast()
      setError(cause instanceof Error ? cause.message : "The pilot broadcast could not be started.")
      setState("error")
    }
  }

  async function stopBroadcast() {
    const resourceUrl = resourceUrlRef.current
    resourceUrlRef.current = ""

    if (resourceUrl) {
      await fetch(resourceUrl, { method: "DELETE", keepalive: true }).catch(() => {})
    }

    const pc = pcRef.current
    pcRef.current = null
    pc?.close()

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (previewRef.current) previewRef.current.srcObject = null
    setCamera(true)
    setMic(true)
    setState("idle")
  }

  const live = state === "live" || state === "connecting"

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section className="overflow-hidden rounded-2xl border border-border bg-black">
        <div className="relative aspect-video">
          <video ref={previewRef} playsInline className="h-full w-full object-cover" />
          {!streamRef.current ? (
            <div className="absolute inset-0 grid place-items-center bg-neutral-950 text-center text-white">
              <div>
                <Radio className="mx-auto size-8 text-brand-green" />
                <p className="mt-3 text-sm font-bold">WIGOD Broadcast Canvas — Transport Pilot</p>
                <p className="mt-1 text-xs text-white/60">Camera + microphone → WHIP → MediaMTX → YouTube</p>
              </div>
            </div>
          ) : null}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-bold text-white">
            {state === "live" ? <Wifi className="size-3.5 text-brand-green" /> : <WifiOff className="size-3.5" />}
            {state === "live" ? "TRANSPORT LIVE" : state === "connecting" ? "CONNECTING" : "PREVIEW"}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Stage 1 — Transport proof</p>
          <h2 className="mt-1 text-lg font-bold">WIGOD Pilot Broadcast</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This deliberately starts with camera + microphone only. Once the signal reaches YouTube reliably, we add the WIGOD graphics compositor and then additional destinations.
          </p>
        </div>

        <label className="block text-xs font-semibold">
          Broadcast title
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={live} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setCameraEnabled(!camera)} disabled={live} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">
            {camera ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
            Camera {camera ? "On" : "Off"}
          </button>
          <button type="button" onClick={() => setMicEnabled(!mic)} disabled={live} className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">
            {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            Mic {mic ? "On" : "Off"}
          </button>
        </div>

        {error ? <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 p-3 text-xs leading-5 text-brand-red">{error}</div> : null}

        {state === "idle" || state === "error" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={preview} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Preview</button>
            <button type="button" onClick={startBroadcast} className="rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white">Start Pilot</button>
          </div>
        ) : state === "preview" ? (
          <button type="button" onClick={startBroadcast} className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-xs font-bold text-white">Start Pilot Broadcast</button>
        ) : (
          <button type="button" onClick={stopBroadcast} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2.5 text-xs font-bold text-white">
            <Square className="size-3.5 fill-current" /> Stop Broadcast
          </button>
        )}

        <div className="rounded-lg bg-secondary/50 p-3 text-[10px] leading-5 text-muted-foreground">
          <strong className="text-foreground">Destination:</strong> {WHIP_URL ? "Pilot ingest configured" : "Not configured yet"}<br />
          <strong className="text-foreground">Program title:</strong> {title || "Untitled broadcast"}<br />
          <strong className="text-foreground">Next:</strong> composite camera + WIGOD lower thirds, ticker and headline into the outgoing program feed.
        </div>
      </section>
    </div>
  )
}
