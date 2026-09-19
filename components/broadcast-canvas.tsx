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

  useEffect(() => () => stopAll(), [])

  function stopAll() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    cameraRef.current?.getTracks().forEach((track) => track.stop())
    audioRef.current?.getTracks().forEach((track) => track.stop())
    screenRef.current?.getTracks().forEach((track) => track.stop())
    cameraRef.current = null
    screenRef.current = null
    audioRef.current = null
    setCameraOn(false)
    setMicOn(false)
    setScreenOn(false)
    setRunning(false)
  }


  function applyStudioScene(preset: typeof STUDIO_SCENES[number]) {
    setActivePreset(preset.id)
    setScene(preset.scene)
    setShowLowerThird(preset.lowerThird)
    setShowTicker(preset.ticker)
    setHeadline(preset.headline)
    setLowerName(preset.name)
    setLowerRole(preset.role)
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
    if (mediaType === "image") {
      const image = mediaImageRef.current
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
  function draw() {
    const canvas = canvasRef.current
    const video = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#07110d"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

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
    ctx.fillStyle = "#0f8f4f"
    ctx.fillRect(0, 0, 12, 96)
    ctx.font = "700 34px Arial"
    ctx.fillStyle = "#fff"
    ctx.fillText("AFRICA & BEYOND", 42, 62)
    ctx.font = "700 24px Arial"
    ctx.fillStyle = "#d62828"
    ctx.fillText("LIVE", WIDTH - 100, 60)

    if (headline.trim()) {
      ctx.fillStyle = "rgba(0,0,0,.78)"
      ctx.fillRect(48, HEIGHT - 310, WIDTH - 96, 88)
      ctx.font = "700 40px Arial"
      ctx.fillStyle = "#fff"
      ctx.fillText(headline.slice(0, 70), 76, HEIGHT - 254)
    }

    if (showLowerThird) {
      ctx.fillStyle = "rgba(5, 15, 10, .92)"
      ctx.fillRect(48, HEIGHT - 215, 720, 92)
      ctx.fillStyle = "#0f8f4f"
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
      ctx.fillStyle = "#d62828"
      ctx.fillRect(0, HEIGHT - 82, WIDTH, 82)
      ctx.font = "700 26px Arial"
      ctx.fillStyle = "#fff"
      tickerXRef.current -= 2.2
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
