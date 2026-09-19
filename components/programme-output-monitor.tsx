"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Square, Radio } from "lucide-react"

const WIDTH = 1920
const HEIGHT = 1080

type StudioGraphics = {
  layout?: string
  showOverlay?: boolean
  overlayDesign?: string
  screenText?: string
  screenTextOn?: boolean
  screenTextPosition?: "top" | "middle" | "bottom"
  lowerThird?: boolean
  lowerName?: string
  lowerRole?: string
  primaryColor?: string
  accentColor?: string
  bannerColor?: string
  bannerTextColor?: string
  bannerLayout?: string
  bannerRadius?: string
  tickerColor?: string
  tickerSpeed?: number
  ticker?: string
  tickerOn?: boolean
  headlineOn?: boolean
  headlines?: string
  headlineIndex?: number
  logoUrl?: string
  overlayUrl?: string
  backgroundUrl?: string
  backgroundKind?: string
  mediaUrl?: string
  mediaPlaying?: boolean
}

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
  const overlayRef = useRef<HTMLImageElement>(null)
  const backgroundRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const tickerXRef = useRef(WIDTH)
  const graphicsRef = useRef<StudioGraphics>({})
  const mediaRefState = useRef<StudioMedia>({})
  const [running, setRunning] = useState(false)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    const syncMedia = (event: Event) => {
      const detail = (event as CustomEvent<StudioMedia>).detail || {}
      mediaRefState.current = detail
      if (cameraRef.current) cameraRef.current.srcObject = detail.camera ?? null
      if (screenRef.current) screenRef.current.srcObject = detail.screen ?? null
      void cameraRef.current?.play().catch(() => {})
      void screenRef.current?.play().catch(() => {})
    }

    const syncGraphics = (event: Event) => {
      const detail = (event as CustomEvent<StudioGraphics>).detail || {}
      graphicsRef.current = detail
      setSynced(true)
      loadImage(logoRef, detail.logoUrl)
      loadImage(overlayRef, detail.overlayUrl)
      loadImage(backgroundRef, detail.backgroundKind === "picture" ? detail.backgroundUrl : "")
      if (mediaRef.current) {
        mediaRef.current.src = detail.mediaUrl || ""
        if (detail.mediaPlaying) void mediaRef.current.play().catch(() => {})
      }
    }

    window.addEventListener("wigod-studio-media", syncMedia)
    window.addEventListener("wigod-studio-graphics", syncGraphics)

    const currentMedia = (window as Window & { __wigodStudioMedia?: StudioMedia }).__wigodStudioMedia
    if (currentMedia) syncMedia(new CustomEvent("wigod-studio-media", { detail: currentMedia }))

    const currentGraphics = (window as Window & { __wigodStudioGraphics?: StudioGraphics }).__wigodStudioGraphics
    if (currentGraphics) {
      syncGraphics(new CustomEvent("wigod-studio-graphics", { detail: currentGraphics }))
    } else {
      try {
        const raw = window.localStorage.getItem("wigod-live-studio-preferences")
        if (raw) syncGraphics(new CustomEvent("wigod-studio-graphics", { detail: JSON.parse(raw) }))
      } catch {}
    }

    return () => {
      window.removeEventListener("wigod-studio-media", syncMedia)
      window.removeEventListener("wigod-studio-graphics", syncGraphics)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [running])

  function loadImage(ref: React.RefObject<HTMLImageElement | null>, url?: string) {
    const image = ref.current
    if (!image) return
    image.src = url || ""
  }

  function fit(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, x: number, y: number, w: number, h: number) {
    if (!sw || !sh) return
    const scale = Math.max(w / sw, h / sh)
    const dw = sw * scale
    const dh = sh * scale
    ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    ctx.fill()
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const liveGraphics = (window as Window & { __wigodStudioGraphics?: StudioGraphics }).__wigodStudioGraphics
    if (liveGraphics) graphicsRef.current = liveGraphics
    const liveMedia = (window as Window & { __wigodStudioMedia?: StudioMedia }).__wigodStudioMedia
    if (liveMedia) mediaRefState.current = liveMedia

    const g = graphicsRef.current
    const media = mediaRefState.current
    const camera = cameraRef.current
    const screen = screenRef.current
    const clip = mediaRef.current
    const layout = g.layout || "single"

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
      if (!g.mediaPlaying || !clip?.videoWidth) return
      fit(ctx, clip, clip.videoWidth, clip.videoHeight, 0, 0, WIDTH, HEIGHT)
    }

    if (layout === "screen") {
      drawScreen()
    } else if (layout === "pip") {
      drawScreen()
      if (camera?.readyState && camera.videoWidth) {
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(WIDTH - 520, HEIGHT - 350, 460, 290, 22)
        ctx.clip()
        fit(ctx, camera, camera.videoWidth, camera.videoHeight, WIDTH - 520, HEIGHT - 350, 460, 290)
        ctx.restore()
      }
    } else if (layout === "group" || layout === "news" || layout === "split") {
      if (screen?.readyState && screen.videoWidth) fit(ctx, screen, screen.videoWidth, screen.videoHeight, 0, 0, WIDTH * 0.66, HEIGHT)
      drawCameraTo(ctx, camera, WIDTH * 0.66, 0, WIDTH * 0.34, HEIGHT)
    } else if (layout === "media" || layout === "cinema") {
      drawMedia()
    } else {
      drawCamera()
    }

    if (g.showOverlay && g.overlayUrl && overlayRef.current?.naturalWidth) {
      ctx.globalAlpha = 0.95
      ctx.drawImage(overlayRef.current, 0, 0, WIDTH, HEIGHT)
      ctx.globalAlpha = 1
    }

    if (g.logoUrl && !g.headlineOn && logoRef.current?.naturalWidth) {
      const logo = logoRef.current
      const scale = Math.min(120 / logo.naturalWidth, 90 / logo.naturalHeight)
      ctx.drawImage(logo, WIDTH - logo.naturalWidth * scale - 36, 30, logo.naturalWidth * scale, logo.naturalHeight * scale)
    }

    if (g.screenTextOn && g.screenText) {
      const y = g.screenTextPosition === "middle" ? HEIGHT / 2 - 30 : g.screenTextPosition === "bottom" ? HEIGHT - 180 : 120
      ctx.fillStyle = "rgba(0,0,0,.75)"
      roundRect(ctx, 70, y, Math.min(ctx.measureText(g.screenText).width + 70, WIDTH - 140), 64, 10)
      ctx.fillStyle = "#fff"
      ctx.font = "700 30px Arial"
      ctx.fillText(g.screenText.slice(0, 100), 100, y + 42)
    }

    if (g.lowerThird) drawLowerThird(ctx, g)

    if (g.headlineOn && g.headlines) drawHeadline(ctx, g)

    if (g.tickerOn && g.ticker) {
      ctx.fillStyle = g.tickerColor || "#d62828"
      ctx.fillRect(0, HEIGHT - 58, WIDTH, 58)
      ctx.font = "700 24px Arial"
      ctx.fillStyle = g.bannerTextColor || "#fff"
      const text = g.ticker
      tickerXRef.current -= Math.max(0.5, (g.tickerSpeed || 36) / 12)
      const width = ctx.measureText(text).width
      if (tickerXRef.current < -width - 80) tickerXRef.current = WIDTH
      ctx.fillText(text, tickerXRef.current, HEIGHT - 21)
    }

    frameRef.current = requestAnimationFrame(draw)
  }

  function drawCameraTo(ctx: CanvasRenderingContext2D, camera: HTMLVideoElement | null, x: number, y: number, w: number, h: number) {
    if (camera?.readyState && camera.videoWidth) fit(ctx, camera, camera.videoWidth, camera.videoHeight, x, y, w, h)
  }

  function drawLowerThird(ctx: CanvasRenderingContext2D, g: StudioGraphics) {
    const primary = g.primaryColor || "#0f8f4f"
    const banner = g.bannerColor || "#111"
    const text = g.bannerTextColor || "#fff"
    const radius = g.bannerRadius === "pill" ? 46 : g.bannerRadius === "rounded" ? 14 : 0
    const name = g.lowerName || "WIGOD LIVE"
    const role = g.lowerRole || ""

    if (g.bannerLayout === "full-width") {
      ctx.fillStyle = banner
      ctx.fillRect(0, HEIGHT - 190, WIDTH, 140)
      ctx.fillStyle = primary
      ctx.fillRect(0, HEIGHT - 190, WIDTH, 6)
      ctx.fillStyle = text
      ctx.font = "700 34px Arial"
      ctx.fillText(name, 60, HEIGHT - 120)
      ctx.font = "400 24px Arial"
      ctx.fillText(role, 60, HEIGHT - 82)
    } else if (g.bannerLayout === "split") {
      ctx.fillStyle = primary
      roundRect(ctx, 50, HEIGHT - 175, 360, 75, radius)
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(name, 76, HEIGHT - 128)
      ctx.fillStyle = banner
      ctx.fillRect(410, HEIGHT - 175, 520, 75)
      ctx.fillStyle = text
      ctx.font = "400 23px Arial"
      ctx.fillText(role, 438, HEIGHT - 128)
    } else if (g.bannerLayout === "pill") {
      ctx.fillStyle = banner
      roundRect(ctx, 50, HEIGHT - 175, 760, 75, 38)
      ctx.strokeStyle = g.accentColor || "#d62828"
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(name, 80, HEIGHT - 128)
      ctx.font = "400 20px Arial"
      ctx.fillText(role, 80, HEIGHT - 98)
    } else if (g.bannerLayout === "corner") {
      ctx.fillStyle = banner
      roundRect(ctx, WIDTH - 560, HEIGHT - 175, 510, 75, radius)
      ctx.fillStyle = text
      ctx.font = "700 26px Arial"
      ctx.fillText(name, WIDTH - 530, HEIGHT - 128)
      ctx.font = "400 20px Arial"
      ctx.fillText(role, WIDTH - 530, HEIGHT - 98)
    } else if (g.bannerLayout === "headline") {
      ctx.fillStyle = banner
      ctx.fillRect(50, HEIGHT - 175, WIDTH - 100, 75)
      ctx.fillStyle = primary
      ctx.fillRect(50, HEIGHT - 175, 7, 75)
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(name, 78, HEIGHT - 128)
      ctx.font = "400 20px Arial"
      ctx.fillText(role, 78, HEIGHT - 98)
    } else {
      ctx.fillStyle = banner
      roundRect(ctx, 50, HEIGHT - 175, 760, 75, radius)
      ctx.fillStyle = primary
      ctx.fillRect(50, HEIGHT - 175, 7, 75)
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(name, 78, HEIGHT - 128)
      ctx.font = "400 20px Arial"
      ctx.fillText(role, 78, HEIGHT - 98)
    }
  }

  function drawHeadline(ctx: CanvasRenderingContext2D, g: StudioGraphics) {
    const lines = (g.headlines || "").split("\n").map((v) => v.trim()).filter(Boolean)
    const headline = lines[g.headlineIndex || 0] || lines[0] || "WIGOD NEWS"
    const primary = g.primaryColor || "#0f8f4f"
    const accent = g.accentColor || "#d62828"
    const banner = g.bannerColor || "#111"
    const text = g.bannerTextColor || "#fff"

    if (g.overlayDesign === "capsule") {
      ctx.fillStyle = banner
      roundRect(ctx, 110, HEIGHT - 145, WIDTH - 220, 68, 34)
      ctx.strokeStyle = primary
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = primary
      ctx.font = "700 18px Arial"
      ctx.fillText("HEADLINES", 145, HEIGHT - 103)
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(headline.slice(0, 90), 290, HEIGHT - 103)
      ctx.fillStyle = accent
      ctx.fillRect(WIDTH - 210, HEIGHT - 145, 150, 68)
      ctx.fillStyle = text
      ctx.font = "700 18px Arial"
      ctx.fillText("LIVE NEWS", WIDTH - 190, HEIGHT - 103)
    } else if (g.overlayDesign === "badge") {
      ctx.fillStyle = banner
      roundRect(ctx, 110, HEIGHT - 150, WIDTH - 170, 75, 10)
      ctx.fillStyle = accent
      ctx.fillRect(110, HEIGHT - 75, WIDTH - 170, 4)
      ctx.fillStyle = primary
      ctx.font = "700 18px Arial"
      ctx.fillText("BREAKING NEWS", 150, HEIGHT - 115)
      ctx.fillStyle = text
      ctx.font = "700 28px Arial"
      ctx.fillText(headline.slice(0, 90), 150, HEIGHT - 85)
    } else {
      ctx.fillStyle = banner
      ctx.fillRect(48, HEIGHT - 175, WIDTH - 96, 78)
      ctx.fillStyle = text
      ctx.font = "700 30px Arial"
      ctx.fillText(headline.slice(0, 100), 78, HEIGHT - 125)
      ctx.fillStyle = accent
      ctx.fillRect(48, HEIGHT - 175, 8, 78)
    }
  }

  function startProgramme() {
    if (!canvasRef.current) return
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    setRunning(true)
    tickerXRef.current = WIDTH
    frameRef.current = requestAnimationFrame(draw)
    const stream = canvasRef.current.captureStream(30)
    for (const track of mediaRefState.current.microphone?.getAudioTracks() || []) stream.addTrack(track)
    streamRef.current = stream
    window.dispatchEvent(new CustomEvent("wigod-program-stream", { detail: stream }))
  }

  function stopProgramme() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => { if (track.kind === "video") track.stop() })
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
          <p className="mt-1 text-xs text-muted-foreground">{synced ? "Showing the same graphics and sources selected in Live Studio." : "Waiting for Live Studio settings."}</p>
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
      <img ref={overlayRef} alt="" crossOrigin="anonymous" className="hidden" />
      <img ref={backgroundRef} alt="" crossOrigin="anonymous" className="hidden" />
    </section>
  )
}
