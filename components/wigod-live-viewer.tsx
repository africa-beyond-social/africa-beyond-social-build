"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"
import { Loader2, Radio, Users } from "lucide-react"

declare global {
  interface Window {
    LivekitClient?: {
      Room: new (options?: Record<string, unknown>) => any
      RoomEvent: Record<string, string>
    }
  }
}

type Props = {
  room: string
  title?: string | null
}

export function WigodLiveViewer({ room, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<any>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!sdkReady || !room || !window.LivekitClient || roomRef.current) return

    let active = true
    const connect = async () => {
      try {
        const response = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, role: "viewer" }),
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "Could not obtain a Live token.")

        const livekit = window.LivekitClient!
        const liveRoom = new livekit.Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = liveRoom

        const attach = (track: any) => {
          const element = track.attach()
          element.className = "size-full object-contain bg-black"
          if (element instanceof HTMLVideoElement) {
            element.playsInline = true
            element.autoplay = true
          }
          if (mountRef.current) {
            mountRef.current.replaceChildren(element)
          }
        }

        const syncCount = () => setViewers(Math.max(0, liveRoom.numParticipants - 1))

        liveRoom.on(livekit.RoomEvent.TrackSubscribed, (track: any) => attach(track))
        liveRoom.on(livekit.RoomEvent.ParticipantConnected, syncCount)
        liveRoom.on(livekit.RoomEvent.ParticipantDisconnected, syncCount)
        liveRoom.on(livekit.RoomEvent.Disconnected, () => {
          if (active) {
            setConnected(false)
            setViewers(0)
          }
        })

        await liveRoom.connect(payload.serverUrl, payload.token, { autoSubscribe: true })
        if (!active) {
          await liveRoom.disconnect()
          return
        }

        setConnected(true)
        syncCount()

        for (const participant of liveRoom.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            if (publication.isSubscribed && publication.track) attach(publication.track)
          }
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "WIGOD could not connect to the live programme.")
          setConnected(false)
        }
      }
    }

    void connect()

    return () => {
      active = false
      const liveRoom = roomRef.current
      roomRef.current = null
      if (liveRoom) void liveRoom.disconnect()
      if (mountRef.current) mountRef.current.replaceChildren()
    }
  }, [room, sdkReady])

  return (
    <div className="space-y-3">
      <Script
        src="https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => setError("The WIGOD live video engine could not be loaded.")}
      />
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
        <div ref={mountRef} className="absolute inset-0 flex items-center justify-center">
          {!connected ? (
            <div className="px-5 text-center text-white">
              {error ? <Radio className="mx-auto size-9 text-brand-red" /> : <Loader2 className="mx-auto size-8 animate-spin text-white/70" />}
              <p className="mt-3 text-sm font-bold">{error ? "Live programme unavailable" : "Connecting to WIGOD Live…"}</p>
              {error ? <p className="mt-1 max-w-md text-xs text-white/60">{error}</p> : null}
            </div>
          ) : null}
        </div>
        {connected ? (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-red px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">{title || "WIGOD Live"}</p>
          <p className="text-[11px] text-muted-foreground">Native WIGOD broadcast</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] font-bold">
          <Users className="size-3.5" />
          {viewers} watching
        </div>
      </div>
    </div>
  )
}
