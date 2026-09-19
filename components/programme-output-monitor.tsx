"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Square } from "lucide-react"
import { drawWigodGraphics, type WigodGraphicsState } from "./wigod-graphics-renderer"

const WIDTH = 1920
const HEIGHT = 1080

type StudioMedia = {
  camera?: MediaStream | null
  microphone?: MediaStream | null
  screen?: MediaStream | null
}

export function ProgrammeOutputMonitor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLVideoElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const backgroundRef = useRef<HTMLImageElement>(null)
  const graphicsRef = useRef<WigodGraphicsState>({})
  const mediaStateRef = useRef<StudioMedia>({})
  const tickerRef = useRef({ current: WIDTH })
  const frameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [running, setRunning] = useState(false)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    const syncMedia = (event: Event) => {
      const detail = (event as CustomEvent<StudioMedia>).detail || {}
      mediaStateRef.current = detail
      if (cameraRef.current) cameraRef.current.srcObject = detail.camera ?? null
      if (screenRef.current) screenRef.current.srcObject = detail.screen ?? null
      void cameraRef.current?.play().catch(() => {})
      void screenRef.current?.play().catch(() => {})
    }

    const syncGraphics = (event: Event) => {
      const detail = (event as CustomEvent<WigodGraphicsState>).detail || {}
      graphicsRef.current = detail
      setSynced(true)
      if (logoRef.current) logoRef.current.src = detail.logoUrl || ""
      if (backgroundRef.current) backgroundRef.current.src = detail.backgroundKind === "picture" ? (detail.backgroundUrl || "") : ""
      if (mediaRef.current && mediaRef.current.src !== (detail.mediaUrl || "")) {
        mediaRef.current.src = detail.mediaUrl || ""
      }
      if (detail.mediaPlaying) void mediaRef.current?.play().catch(() => {})
    }

    window.addEventListener("wigod-studio-media", syncMedia)
    window.addEventListener("wigod-studio-graphics", syncGraphics)

    const currentMedia = (window as Window & { __wigodStudioMedia?: StudioMedia }).__wigodStudioMedia
    if (currentMedia) syncMedia(new CustomEvent("wigod-studio-media", { detail: currentMedia }))
    const currentGraphics = (window as Window & { __wigodStudioGraphics?: WigodGraphicsState }).__wigodStudioGraphics
    if (currentGraphics) syncGraphics(new CustomEvent("wigod-studio-graphics", { detail: currentGraphics }))

    return () => {
      window.removeEventListener("wigod-studio-media", syncMedia)
      window.removeEventListener("wigod-studio-graphics", syncGraphics)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!ctx) return

      const g = graphicsRef.current
      const media = mediaStateRef.current
      const camera = cameraRef.current
      const screen = screenRef.current
      const clip = mediaRef.current

      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      if (g.backgroundKind === "picture" && backgroundRef.current?.naturalWidth) {
        fit(ctx, backgroundRef.current, backgroundRef.current.naturalWidth, backgroundRef.current.naturalHeight, 0, 0, WIDTH, HEIGHT)
      }

      const drawCamera = () => {
        if (camera?.readyState && camera.videoWidth) fit(ctx, camera, camera.videoWidth, camera.videoHeight, 0, 0, WIDTH, HEIGHT)
      }
      const drawScreen = () => {
        if (screen?.readyState && screen.videoWidth) fit(ctx, screen, screen.videoWidth, screen.videoHeight, 0, 0, WIDTH, HEIGHT)
      }
      const drawMedia = () => {
        if (g.mediaPlaying && clip?.readyState && clip.videoWidth) fit(ctx, clip, clip.videoWidth, clip.videoHeight, 0, 0, WIDTH, HEIGHT)
      }

      if (g.layout === "screen") {
        drawScreen()
      } else if (g.layout === "pip") {
        drawScreen()
        if (camera?.readyState && camera.videoWidth) fit(ctx, camera, camera.videoWidth, camera.videoHeight, WIDTH - 520, HEIGHT - 350, 460, 290)
      } else if (g.layout === "group" || g.layout === "news" || g.layout === "split") {
        if (screen?.readyState && screen.videoWidth) fit(ctx, screen, screen.videoWidth, screen.videoHeight, 0, 0, WIDTH * 0.66, HEIGHT)
        if (camera?.readyState && camera.videoWidth) fit(ctx, camera, camera.videoWidth, camera.videoHeight, WIDTH * 0.66, 0, WIDTH * 0.34, HEIGHT)
      } else if (g.layout === "media" || g.layout === "cinema") {
        drawMedia()
      } else {
        drawCamera()
      }

      drawWigodGraphics(ctx, g, logoRef.current, tickerRef.current)
      frameRef.current = requestAnimationFrame(draw)
    }

    tickerRef.current.current = WIDTH
    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [running])

  function startProgramme() {
    if (!canvasRef.current) return
    setRunning(true)
    const stream = canvasRef.current.captureStream(30)
    for (const track of mediaStateRef.current.microphone?.getAudioTracks() || []) stream.addTrack(track)
    streamRef.current = stream
    window.dispatchEvent(new CustomEvent("wigod-program-stream", { detail: stream }))
  }

  function stopProgramme() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setRunning(false)
    window.dispatchEvent(new CustomEvent("wigod-program-stream", { detail: null }))
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-green">Programme Output</p>
          <h2 className="mt-1 text-lg font-bold">Live Studio programme monitor</h2>
          <p className="mt-1 text-xs text-muted-foreground">{synced ? "Rendering the same WIGOD graphics engine used by Live Studio." : "Waiting for Live Studio settings."}</p>
        </div>
        <button type="button" onClick={running ? stopProgramme : startProgramme} className={running ? "inline-flex items-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-xs font-semibold text-white" : "inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white"}>
          {running ? <Square className="size-4" /> : <Play className="size-4" />}
          {running ? "Stop Programme" : "Start Programme"}
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl bg-black">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="aspect-video w-full" />
      </div>
      <video ref={cameraRef} muted playsInline className="hidden" />
      <video ref={screenRef} muted playsInline className="hidden" />
      <video ref={mediaRef} muted playsInline className="hidden" />
      <img ref={logoRef} alt="" crossOrigin="anonymous" className="hidden" />
      <img ref={backgroundRef} alt="" crossOrigin="anonymous" className="hidden" />
    </section>
  )
}

function fit(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, x: number, y: number, w: number, h: number) {
  if (!sw || !sh) return
  const scale = Math.max(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}
