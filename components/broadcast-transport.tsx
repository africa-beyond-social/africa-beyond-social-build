"use client"

import { useEffect, useRef, useState } from "react"
import { Square, Wifi, WifiOff } from "lucide-react"

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

export function BroadcastTransport() {
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const resourceUrlRef = useRef("")
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error">("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    const onStream = (event: Event) => {
      const stream = (event as CustomEvent<MediaStream | null>).detail
      streamRef.current = stream
      setReady(Boolean(stream))
      if (!stream && state !== "live") setState("idle")
    }
    window.addEventListener("wigod-program-stream", onStream)
    return () => {
      window.removeEventListener("wigod-program-stream", onStream)
      void stop()
    }
  }, [])

  async function start() {
    setError("")
    if (!WHIP_URL) {
      setError("NEXT_PUBLIC_WIGOD_WHIP_URL is not configured yet.")
      setState("error")
      return
    }
    const stream = streamRef.current
    if (!stream) {
      setError("Start the Broadcast Canvas first.")
      setState("error")
      return
    }
    if (!stream.getVideoTracks().length || !stream.getAudioTracks().length) {
      setError("The programme stream must contain both video and audio.")
      setState("error")
      return
    }

    try {
      setState("connecting")
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setState("live")
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setError("The WHIP connection was interrupted.")
          setState("error")
        }
      }
      await pc.setLocalDescription(await pc.createOffer())
      await waitForIceGathering(pc)
      const offer = pc.localDescription?.sdp
      if (!offer) throw new Error("No WebRTC offer was produced.")

      const response = await fetch(WHIP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer,
      })
      if (!response.ok) throw new Error((await response.text().catch(() => "")) || `WHIP returned HTTP ${response.status}.`)
      const answer = await response.text()
      const location = response.headers.get("Location")
      await pc.setRemoteDescription({ type: "answer", sdp: answer })
      resourceUrlRef.current = location ? new URL(location, WHIP_URL).toString() : ""
      setState("live")
    } catch (cause) {
      await stop()
      setError(cause instanceof Error ? cause.message : "Unable to start the broadcast transport.")
      setState("error")
    }
  }

  async function stop() {
    const resource = resourceUrlRef.current
    resourceUrlRef.current = ""
    if (resource) await fetch(resource, { method: "DELETE", keepalive: true }).catch(() => {})
    pcRef.current?.close()
    pcRef.current = null
    setState("idle")
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Program Transport</p>
          <p className="mt-1 text-sm font-semibold">Canvas → WHIP → MediaMTX</p>
          <p className="mt-1 text-xs text-muted-foreground">The canvas must be running before the programme can be transmitted.</p>
        </div>
        <div className="flex items-center gap-2">
          {state === "live" ? <Wifi className="size-4 text-brand-green" /> : <WifiOff className="size-4 text-muted-foreground" />}
          <span className="text-xs font-bold">{state === "live" ? "TRANSPORT LIVE" : state === "connecting" ? "CONNECTING" : ready ? "CANVAS READY" : "CANVAS OFF"}</span>
          {state === "live" ? <button onClick={() => void stop()} className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-xs font-bold text-white"><Square className="size-3.5 fill-current"/>Stop Transport</button> : <button disabled={!ready || state === "connecting"} onClick={() => void start()} className="rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Start Transport</button>}
        </div>
      </div>
      {error ? <p className="mt-3 rounded-lg bg-brand-red/5 p-3 text-xs text-brand-red">{error}</p> : null}
    </div>
  )
}
