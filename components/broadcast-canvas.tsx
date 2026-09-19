"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, MonitorUp, Mic, Play, Square, Radio, Image as ImageIcon, Video } from "lucide-react"

const WIDTH = 1920
const HEIGHT = 1080
const STUDIO_SCENES = [
  { id: "opening", name: "Opening", scene: "camera" as const, lowerThird: true, ticker: true, headline: "WELCOME TO WIGOD LIVE", name: "WIGOD LIVE", role: "People. Places. Perspectives." },
  { id: "interview", name: "Interview", scene: "split" as const, lowerThird: true, ticker: true, headline: "LIVE INTERVIEW", name: "AFRICA & BEYOND", role: "News | Analysis | Perspective" },
  { id: "screen", name: "Screen Demo", scene: "screen" as const, lowerThird: false, ticker: true, headline: "SCREEN DEMO", name: "WIGOD LIVE", role: "Live presentation" },
  { id: "full", name: "Full Screen", scene: "media" as const, lowerThird: false, ticker: false, headline: "", name: "", role: "" },
] as const


export function BroadcastCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<MediaStream | null>(null)
  const screenRef = useRef<MediaStream | null>(null)
  const screenPreviewRef = useRef<HTMLVideoElement>(null)
  const mediaVideoRef = useRef<HTMLVideoElement>(null)
  const mediaImageRef = useRef<HTMLImageElement>(null)
  const logoImageRef = useRef<HTMLImageElement>(null)
  const backgroundImageRef = useRef<HTMLImageElement>(null)
  const overlayImageRef = useRef<HTMLImageElement>(null)
  const animationRef = useRef<number | null>(null)
  const tickerXRef = useRef(WIDTH)
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [running, setRunning] = useState(false)
  const [headline, setHeadline] = useState("AFRICA & BEYOND LIVE")
  const [lowerName, setLowerName] = useState("Africa & Beyond")
  const [lowerRole, setLowerRole] = useState("News | Analysis | Perspective")
  const [ticker, setTicker] = useState("PEOPLE. PLACES. PERSPECTIVES.   •   AFRICA & BEYOND")
  const [showLowerThird, setShowLowerThird] = useState(true)
  const [showTicker, setShowTicker] = useState(true)
  const [scene, setScene] = useState<"camera" | "screen" | "split" | "media">("camera")
  const [screenOn, setScreenOn] = useState(false)
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [activePreset, setActivePreset] = useState("opening")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState("")
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const [screenText, setScreenText] = useState("")
  const [screenTextOn, setScreenTextOn] = useState(false)
  const [headlineRotationOn, setHeadlineRotationOn] = useState(false)
  const [headlines, setHeadlines] = useState("BREAKING NEWS|AFRICA & BEYOND LIVE|PEOPLE. PLACES. PERSPECTIVES.")
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [headlineInterval, setHeadlineInterval] = useState(5)
  const [overlayDesign, setOverlayDesign] = useState<"ribbon" | "badge" | "capsule" | "angled" | "round">("ribbon")
  const [bannerColor, setBannerColor] = useState("#050f0a")
  const [bannerTextColor, setBannerTextColor] = useState("#ffffff")
  const [primaryColor, setPrimaryColor] = useState("#0f8f4f")
  const [accentColor, setAccentColor] = useState("#d62828")
  const [tickerColor, setTickerColor] = useState("#d62828")
  const [tickerSpeed, setTickerSpeed] = useState(2.2)
  const [overlayUrl, setOverlayUrl] = useState("")
  const [overlayLoaded, setOverlayLoaded] = useState(false)
  const [studioSynced, setStudioSynced] = useState(false)
  const externalMediaRef = useRef(false)

  useEffect(() => () => stopAll(), [])

  function stopAll() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (!externalMediaRef.current) cameraRef.current?.getTracks().forEach((track) => track.stop())
    if (!externalMediaRef.current) audioRef.current?.getTracks().forEach((track) => track.stop())
    if (!externalMediaRef.current) screenRef.current?.getTracks().forEach((track) => track.stop())
    cameraRef.current = null
    screenRef.current = null
    audioRef.current = null
    setCameraOn(false)
    setMicOn(false)
    setScreenOn(false)
    setRunning(false)
  }


  function syncFromStudio(detail: Record<string, unknown>) {
    const layout = typeof detail.layout === "string" ? detail.layout : ""
    const nextScene = ["screen"].includes(layout) ? "screen" : ["media", "cinema"].includes(layout) ? "media" : ["group", "split", "news", "pip"].includes(layout) ? "split" : "camera"
    setScene(nextScene as "camera" | "screen" | "split" | "media")
    if (typeof detail.showOverlay === "boolean") setShowLowerThird(detail.showOverlay)
    if (typeof detail.overlayDesign === "string") setOverlayDesign(detail.overlayDesign as typeof overlayDesign)
    if (typeof detail.screenText === "string") setScreenText(detail.screenText)
    if (typeof detail.screenTextOn === "boolean") setScreenTextOn(detail.screenTextOn)
    if (typeof detail.lowerThird === "boolean") setShowLowerThird(detail.lowerThird)
    if (typeof detail.lowerName === "string") setLowerName(detail.lowerName)
    if (typeof detail.lowerRole === "string") setLowerRole(detail.lowerRole)
    if (typeof detail.primaryColor === "string") setPrimaryColor(detail.primaryColor)
    if (typeof detail.accentColor === "string") setAccentColor(detail.accentColor)
    if (typeof detail.bannerColor === "string") setBannerColor(detail.bannerColor)
    if (typeof detail.bannerTextColor === "string") setBannerTextColor(detail.bannerTextColor)
    if (typeof detail.tickerColor === "string") setTickerColor(detail.tickerColor)
    if (typeof detail.tickerSpeed === "number") setTickerSpeed(Math.max(0.5, detail.tickerSpeed / 16))
    if (typeof detail.ticker === "string") setTicker(detail.ticker)
    if (typeof detail.tickerOn === "boolean") setShowTicker(detail.tickerOn)
    if (typeof detail.headlineOn === "boolean") setHeadlineRotationOn(detail.headlineOn)
    if (typeof detail.headlines === "string") setHeadlines(detail.headlines.replace(/\n/g, "|"))
    if (typeof detail.headlineIndex === "number") setHeadlineIndex(detail.headlineIndex)
    if (typeof detail.logoUrl === "string") { setLogoUrl(detail.logoUrl); if (detail.logoUrl) loadGraphicImage(detail.logoUrl, logoImageRef, setLogoLoaded) }
    if (typeof detail.backgroundUrl === "string") { setBackgroundUrl(detail.backgroundUrl); if (detail.backgroundUrl && detail.backgroundKind !== "video") loadGraphicImage(detail.backgroundUrl, backgroundImageRef, setBackgroundLoaded) }
    if (typeof detail.overlayUrl === "string") { setOverlayUrl(detail.overlayUrl); if (detail.overlayUrl) loadGraphicImage(detail.overlayUrl, overlayImageRef, setOverlayLoaded) }
    setStudioSynced(true)
  }

  useEffect(() => {
    const applyMedia = (event: Event) => {
      const detail = (event as CustomEvent<{camera?: MediaStream | null; microphone?: MediaStream | null; screen?: MediaStream | null}>).detail
      if (!detail) return
      externalMediaRef.current = true
      cameraRef.current = detail.camera ?? null
      audioRef.current = detail.microphone ?? null
      screenRef.current = detail.screen ?? null
      if (previewRef.current) {
        previewRef.current.srcObject = cameraRef.current
        if (cameraRef.current) void previewRef.current.play().catch(() => {})
      }
      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = screenRef.current
        if (screenRef.current) void screenPreviewRef.current.play().catch(() => {})
      }
      setCameraOn(Boolean(detail.camera))
      setMicOn(Boolean(detail.microphone))
      setScreenOn(Boolean(detail.screen))
    }
    window.addEventListener("wigod-studio-media", applyMedia)
    const current = (window as Window & { __wigodStudioMedia?: {camera?: MediaStream | null; microphone?: MediaStream | null; screen?: MediaStream | null} }).__wigodStudioMedia
    if (current) applyMedia(new CustomEvent("wigod-studio-media", { detail: current }))
    return () => window.removeEventListener("wigod-studio-media", applyMedia)
  }, [])

  useEffect(() => {
    const apply = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      if (detail) syncFromStudio(detail)
    }
    window.addEventListener("wigod-studio-graphics", apply)
    try {
      const raw = window.localStorage.getItem("wigod-live-studio-preferences")
      if (raw) syncFromStudio(JSON.parse(raw) as Record<string, unknown>)
    } catch {}
    return () => window.removeEventListener("wigod-studio-graphics", apply)
  }, [])

  useEffect(() => {
    const applyScene = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      if (!detail) return
      const layout = typeof detail.layout === "string" ? detail.layout : ""
      const nextScene =
        ["screen"].includes(layout) ? "screen" :
        ["media", "cinema"].includes(layout) ? "media" :
        ["group", "split", "news", "pip"].includes(layout) ? "split" :
        "camera"
      setScene(nextScene as "camera" | "screen" | "split" | "media")
      setActivePreset(typeof detail.id === "string" ? detail.id : "")
    }

    window.addEventListener("wigod-studio-scene", applyScene)
    const current = (window as Window & { __wigodStudioScene?: Record<string, unknown> }).__wigodStudioScene
    if (current) applyScene(new CustomEvent("wigod-studio-scene", { detail: current }))
    return () => window.removeEventListener("wigod-studio-scene", applyScene)
  }, [])

  function loadGraphicImage(url: string, target: React.RefObject<HTMLImageElement | null>, onLoaded: (loaded: boolean) => void) {
    const image = target.current
    if (!image) return
    onLoaded(false)
    image.onload = () => onLoaded(true)
    image.onerror = () => onLoaded(false)
    image.src = url.trim()
  }

  function applyLogo() {
    if (!logoUrl.trim()) { setLogoLoaded(false); return }
    loadGraphicImage(logoUrl, logoImageRef, setLogoLoaded)
  }

  function applyBackground() {
    if (!backgroundUrl.trim()) { setBackgroundLoaded(false); return }
    loadGraphicImage(backgroundUrl, backgroundImageRef, setBackgroundLoaded)
  }

  function applyStudioScene(preset: typeof STUDIO_SCENES[number]) {
    setActivePreset(preset.id)
    setScene(preset.scene)
    setShowLowerThird(preset.lowerThird)
    setShowTicker(preset.ticker)
    setHeadline(preset.headline)
    setLowerName(preset.name)
    setLowerRole(preset.role)
    if (preset.id === "opening") {
      setOverlayDesign("ribbon")
      setPrimaryColor("#0f8f4f")
      setAccentColor("#d62828")
      setBannerColor("#050f0a")
      setBannerTextColor("#ffffff")
      setTickerColor("#d62828")
    } else if (preset.id === "interview") {
      setOverlayDesign("capsule")
      setPrimaryColor("#0f8f4f")
      setAccentColor("#d62828")
      setBannerColor("#07110d")
      setBannerTextColor("#ffffff")
      setTickerColor("#1d4ed8")
    } else if (preset.id === "screen") {
      setOverlayDesign("badge")
      setPrimaryColor("#0f8f4f")
      setAccentColor("#d62828")
      setBannerColor("#07110d")
      setBannerTextColor("#ffffff")
      setTickerColor("#0f8f4f")
    } else {
      setOverlayDesign("round")
      setPrimaryColor("#111111")
      setAccentColor("#d62828")
      setBannerColor("#111111")
      setBannerTextColor("#ffffff")
      setTickerColor("#111111")
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio: false })
      cameraRef.current?.getTracks().forEach((track) => track.stop())
      cameraRef.current = stream
      if (previewRef.current) {
        previewRef.current.srcObject = stream
        await previewRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setCameraOn(false)
    }
  }

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      audioRef.current?.getTracks().forEach((track) => track.stop())
      audioRef.current = stream
      setMicOn(true)
    } catch {
      setMicOn(false)
    }
  }

  async function startScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } }, audio: false })
      screenRef.current?.getTracks().forEach((track) => track.stop())
      screenRef.current = stream
      if (screenPreviewRef.current) { screenPreviewRef.current.srcObject = stream; await screenPreviewRef.current.play() }
      const track = stream.getVideoTracks()[0]
      track.addEventListener("ended", () => { screenRef.current = null; setScreenOn(false); setScene((current) => current === "screen" || current === "split" ? "camera" : current) })
      setScreenOn(true)
    } catch { setScreenOn(false) }
  }

  function loadMedia() {
    setMediaLoaded(false)
    if (!mediaUrl.trim()) return
    if (mediaType === "image") {      const image = mediaImageRef.current
      if (!image) return
      image.src = mediaUrl.trim(); image.onload = () => setMediaLoaded(true); image.onerror = () => setMediaLoaded(false)
    } else {
      const video = mediaVideoRef.current
      if (!video) return
      video.src = mediaUrl.trim(); video.load()
      void video.play().then(() => setMediaLoaded(true)).catch(() => setMediaLoaded(false))
    }
  }

  function drawFit(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) {
    const scale = Math.max(width / sourceWidth, height / sourceHeight)
    const w = sourceWidth * scale; const h = sourceHeight * scale
    ctx.drawImage(source, x + (width - w) / 2, y + (height - h) / 2, w, h)
  }
  useEffect(() => {
    if (!running || !headlineRotationOn) return
    const items = headlines.split("|").map((item) => item.trim()).filter(Boolean)
    if (items.length < 2) return
    const timer = window.setInterval(() => setHeadlineIndex((index) => (index + 1) % items.length), Math.max(2, headlineInterval) * 1000)
    return () => window.clearInterval(timer)
  }, [running, headlineRotationOn, headlines, headlineInterval])

  useEffect(() => {
    const items = headlines.split("|").map((item) => item.trim()).filter(Boolean)
    if (items.length) setHeadline(items[Math.min(headlineIndex, items.length - 1)])
  }, [headlineIndex, headlines])

  function draw() {
    const canvas = canvasRef.current
    const video = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#07110d"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    if (backgroundLoaded && backgroundImageRef.current?.naturalWidth) {
      drawFit(ctx, backgroundImageRef.current, backgroundImageRef.current.naturalWidth, backgroundImageRef.current.naturalHeight, 0, 0, WIDTH, HEIGHT)
    }

    const screenVideo = screenPreviewRef.current
    const mediaVideo = mediaVideoRef.current
    const mediaImage = mediaImageRef.current
    if (scene === "camera" && video && video.readyState >= 2 && video.videoWidth) drawFit(ctx, video, video.videoWidth, video.videoHeight, 0, 0, WIDTH, HEIGHT)
    else if (scene === "screen" && screenVideo && screenVideo.readyState >= 2 && screenVideo.videoWidth) drawFit(ctx, screenVideo, screenVideo.videoWidth, screenVideo.videoHeight, 0, 0, WIDTH, HEIGHT)
    else if (scene === "split") {
      if (screenVideo && screenVideo.readyState >= 2 && screenVideo.videoWidth) drawFit(ctx, screenVideo, screenVideo.videoWidth, screenVideo.videoHeight, 0, 0, WIDTH * 0.66, HEIGHT)
      if (video && video.readyState >= 2 && video.videoWidth) drawFit(ctx, video, video.videoWidth, video.videoHeight, WIDTH * 0.66, 0, WIDTH * 0.34, HEIGHT)
    } else if (scene === "media" && mediaLoaded) {
      if (mediaType === "image" && mediaImage?.naturalWidth) drawFit(ctx, mediaImage, mediaImage.naturalWidth, mediaImage.naturalHeight, 0, 0, WIDTH, HEIGHT)
      if (mediaType === "video" && mediaVideo?.readyState >= 2 && mediaVideo.videoWidth) drawFit(ctx, mediaVideo, mediaVideo.videoWidth, mediaVideo.videoHeight, 0, 0, WIDTH, HEIGHT)
    } else if (video && video.readyState >= 2 && video.videoWidth) drawFit(ctx, video, video.videoWidth, video.videoHeight, 0, 0, WIDTH, HEIGHT)

    ctx.fillStyle = "rgba(4, 12, 8, .48)"
    ctx.fillRect(0, 0, WIDTH, 96)
    ctx.fillStyle = primaryColor
    ctx.fillRect(0, 0, 12, 96)
    if (logoLoaded && logoImageRef.current?.naturalWidth) {
      const logo = logoImageRef.current
      const scale = Math.min(170 / logo.naturalWidth, 72 / logo.naturalHeight)
      ctx.drawImage(logo, 42, 12, logo.naturalWidth * scale, logo.naturalHeight * scale)
    } else {
      ctx.font = "700 34px Arial"
      ctx.fillStyle = "#fff"
      ctx.fillText("AFRICA & BEYOND", 42, 62)
    }
    ctx.font = "700 24px Arial"
    ctx.fillStyle = accentColor
    ctx.fillText("LIVE", WIDTH - 100, 60)

    if (screenTextOn && screenText.trim()) {
      ctx.fillStyle = "rgba(0,0,0,.72)"
      ctx.font = "700 30px Arial"
      const textWidth = Math.min(ctx.measureText(screenText).width + 44, WIDTH - 160)
      ctx.fillRect(80, 118, textWidth, 58)
      ctx.fillStyle = "#fff"
      ctx.fillText(screenText.slice(0, 90), 102, 157)
    }

    if (headline.trim()) {
      ctx.fillStyle = bannerColor
      const headlineWidth = WIDTH - 96
      if (overlayDesign === "capsule" || overlayDesign === "round") {
        ctx.beginPath()
        ctx.roundRect(48, HEIGHT - 310, headlineWidth, 88, overlayDesign === "round" ? 44 : 18)
        ctx.fill()
      } else if (overlayDesign === "angled") {
        ctx.beginPath()
        ctx.moveTo(48, HEIGHT - 310); ctx.lineTo(WIDTH - 80, HEIGHT - 310); ctx.lineTo(WIDTH - 48, HEIGHT - 222); ctx.lineTo(48, HEIGHT - 222); ctx.closePath(); ctx.fill()
      } else if (overlayDesign === "badge") {
        ctx.fillRect(48, HEIGHT - 310, 420, 88)
      } else {
        ctx.fillRect(48, HEIGHT - 310, headlineWidth, 88)
      }
      ctx.font = "700 40px Arial"
      ctx.fillStyle = bannerTextColor
      ctx.fillText(headline.slice(0, 70), 76, HEIGHT - 254)
    }

    if (overlayLoaded && overlayImageRef.current?.naturalWidth) {
      ctx.globalAlpha = 0.95
      ctx.drawImage(overlayImageRef.current, 0, 0, WIDTH, HEIGHT)
      ctx.globalAlpha = 1
    }

    if (showLowerThird) {
      ctx.fillStyle = bannerColor
      if (overlayDesign === "capsule" || overlayDesign === "round") {
        ctx.beginPath()
        ctx.roundRect(48, HEIGHT - 215, 720, 92, overlayDesign === "round" ? 46 : 18)
        ctx.fill()
      } else {
        ctx.fillRect(48, HEIGHT - 215, 720, 92)
      }
      ctx.fillStyle = primaryColor
      ctx.fillRect(48, HEIGHT - 215, 12, 92)
      ctx.font = "700 30px Arial"
      ctx.fillStyle = "#fff"
      ctx.fillText(lowerName.slice(0, 38), 82, HEIGHT - 165)
      ctx.font = "400 21px Arial"
      ctx.fillStyle = "#d8e7de"
      ctx.fillText(lowerRole.slice(0, 55), 82, HEIGHT - 132)
    }

    if (showTicker) {
      const text = ticker || ""
      ctx.fillStyle = tickerColor
      ctx.fillRect(0, HEIGHT - 82, WIDTH, 82)
      ctx.font = "700 26px Arial"
      ctx.fillStyle = "#fff"
      tickerXRef.current -= tickerSpeed
      const width = ctx.measureText(text).width
      if (tickerXRef.current < -width - 60) tickerXRef.current = WIDTH
      ctx.fillText(text, tickerXRef.current, HEIGHT - 31)
    }

    animationRef.current = requestAnimationFrame(draw)
  }

  function startCanvas() {
    if (!canvasRef.current) return
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    setRunning(true)
    tickerXRef.current = WIDTH
    animationRef.current = requestAnimationFrame(draw)
    window.dispatchEvent(new CustomEvent("wigod-program-stream", { detail: getProgramStream() }))
  }

  function stopCanvas() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    setRunning(false)
    window.dispatchEvent(new CustomEvent("wigod-program-stream", { detail: null }))
  }

  function getProgramStream() {
    if (!canvasRef.current) return null
    const videoStream = canvasRef.current.captureStream(30)
    const audioTracks = audioRef.current?.getAudioTracks() ?? []
    audioTracks.forEach((track) => videoStream.addTrack(track))
    return videoStream
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Broadcast Canvas V1</p>
          <h2 className="mt-1 text-lg font-bold">Programme output</h2>
          <p className="mt-1 text-xs text-muted-foreground">1080p30 canvas composition with scenes, camera, screen share, media, lower third, headline and ticker.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void startCamera()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Camera className="size-4"/>{cameraOn ? "Camera ready" : "Camera"}</button>
          <button onClick={() => void startMic()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Mic className="size-4"/>{micOn ? "Mic ready" : "Microphone"}</button>
          {!running ? <button onClick={startCanvas} className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white"><Play className="size-4"/>Start Canvas</button> : <button onClick={stopCanvas} className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-xs font-semibold text-white"><Square className="size-4"/>Stop Canvas</button>}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-black">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="aspect-video w-full" />
      </div>
      <video ref={previewRef} muted playsInline className="hidden" />
      <video ref={screenPreviewRef} muted playsInline className="hidden" />
      <video ref={mediaVideoRef} muted loop playsInline className="hidden" />
      <img ref={mediaImageRef} alt="" crossOrigin="anonymous" className="hidden" />
      <img ref={logoImageRef} alt="" crossOrigin="anonymous" className="hidden" />
      <img ref={backgroundImageRef} alt="" crossOrigin="anonymous" className="hidden" />
      <img ref={overlayImageRef} alt="" crossOrigin="anonymous" className="hidden" />


      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider">Studio Scene Presets</p><p className="mt-1 text-[11px] text-muted-foreground">Presets mirror the existing WIGOD Live Studio scene system.</p></div>
          <div className="flex flex-wrap gap-2">{STUDIO_SCENES.map((preset) => <button key={preset.id} onClick={() => applyStudioScene(preset)} className={activePreset === preset.id ? "rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white" : "rounded-lg border px-3 py-2 text-xs font-semibold"}>{preset.name}</button>)}</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider">Scenes</p><p className="mt-1 text-[11px] text-muted-foreground">Choose what the programme canvas shows.</p></div>
          <div className="flex flex-wrap gap-2">{([["camera","Camera"],["screen","Screen"],["split","Split"],["media","Media"]] as const).map(([value,label]) => <button key={value} onClick={() => setScene(value)} className={scene === value ? "rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white" : "rounded-lg border px-3 py-2 text-xs font-semibold"}>{label}</button>)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void startScreen()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><MonitorUp className="size-4"/>{screenOn ? "Screen ready" : "Share screen"}</button><span className="inline-flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-[11px]">{screenOn ? "SCREEN CAPTURE ACTIVE" : "SCREEN CAPTURE OFF"}</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-[120px_1fr_auto]"><select value={mediaType} onChange={(e) => { setMediaType(e.target.value as "image" | "video"); setMediaLoaded(false) }} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="image">Image</option><option value="video">Video</option></select><input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Media URL (HTTPS)" className="rounded-lg border bg-background px-3 py-2 text-sm" /><button onClick={loadMedia} className="inline-flex items-center justify-center gap-2 rounded-lg bg-background px-3 py-2 text-xs font-semibold border">{mediaType === "image" ? <ImageIcon className="size-4"/> : <Video className="size-4"/>}Load media</button></div>
        <p className="mt-2 text-[11px] text-muted-foreground">{mediaLoaded ? "Media loaded into the programme canvas." : "Use media hosted with CORS enabled; remote media may be blocked by the browser."}</p>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-xs font-bold uppercase tracking-wider">Broadcast Graphics Sync</p>
        <p className="mt-1 text-[11px] text-muted-foreground">These graphics are rendered into the programme capture, so they travel to the WHIP transport and downstream broadcast.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL (HTTPS)" className="rounded-lg border bg-background px-3 py-2 text-sm" />
          <button onClick={applyLogo} className="rounded-lg border px-3 py-2 text-xs font-semibold">{logoLoaded ? "Logo loaded" : "Load logo"}</button>
          <input value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} placeholder="Background image URL (HTTPS)" className="rounded-lg border bg-background px-3 py-2 text-sm" />
          <button onClick={applyBackground} className="rounded-lg border px-3 py-2 text-xs font-semibold">{backgroundLoaded ? "Background loaded" : "Load background"}</button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs font-semibold">Screen text<input value={screenText} onChange={(e) => setScreenText(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
          <label className="flex items-end gap-2 text-xs font-semibold"><input type="checkbox" checked={screenTextOn} onChange={(e) => setScreenTextOn(e.target.checked)} className="mb-2" /> Show screen text</label>
          <label className="text-xs font-semibold">Overlay design<select value={overlayDesign} onChange={(e) => setOverlayDesign(e.target.value as typeof overlayDesign)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="ribbon">Ribbon</option><option value="badge">Badge</option><option value="capsule">Capsule</option><option value="angled">Angled</option><option value="round">Round</option></select></label>
          <label className="text-xs font-semibold">Ticker speed<input type="number" min="0.5" max="8" step="0.1" value={tickerSpeed} onChange={(e) => setTickerSpeed(Number(e.target.value) || 2.2)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <label className="text-xs font-semibold">Primary<input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="mt-1 h-9 w-full rounded border bg-background" /></label>
          <label className="text-xs font-semibold">Accent<input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="mt-1 h-9 w-full rounded border bg-background" /></label>
          <label className="text-xs font-semibold">Banner<input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} className="mt-1 h-9 w-full rounded border bg-background" /></label>
          <label className="text-xs font-semibold">Ticker<input type="color" value={tickerColor} onChange={(e) => setTickerColor(e.target.value)} className="mt-1 h-9 w-full rounded border bg-background" /></label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
          <label className="text-xs font-semibold">Headline rotation (separate with |)<input value={headlines} onChange={(e) => setHeadlines(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold">Seconds<input type="number" min="2" max="60" value={headlineInterval} onChange={(e) => setHeadlineInterval(Number(e.target.value) || 5)} className="mt-1 w-24 rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        </div>
        <button onClick={() => setHeadlineRotationOn((v) => !v)} className="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold">{headlineRotationOn ? "Disable" : "Enable"} headline rotation</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold">Headline<input value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold">Lower-third name<input value={lowerName} onChange={(e) => setLowerName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold">Role / description<input value={lowerRole} onChange={(e) => setLowerRole(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold">Ticker<input value={ticker} onChange={(e) => setTicker(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button onClick={() => setShowLowerThird((v) => !v)} className="rounded-lg border px-3 py-2 font-semibold">{showLowerThird ? "Hide" : "Show"} lower third</button>
        <button onClick={() => setShowTicker((v) => !v)} className="rounded-lg border px-3 py-2 font-semibold">{showTicker ? "Hide" : "Show"} ticker</button>
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-2"><Radio className="size-3.5"/>Canvas output: 1920×1080 / 30fps</span>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">The canvas is the programme source. Scene changes, screen sharing and media are rendered into the same captureStream() sent to the WIGOD WHIP transport.</p>
    </section>
  )
}