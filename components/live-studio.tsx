"use client"

import { type ChangeEvent, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Clapperboard,
  Image as ImageIcon,
  Layers3,
  LayoutPanelTop,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  RefreshCw,
  Settings2,
  Sparkles,
  Type,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

type Layout =
  | "single"
  | "cropped"
  | "group"
  | "spotlight"
  | "news"
  | "screen"
  | "pip"
  | "cinema"

type Panel = "settings" | "brand" | "layout" | "scenes" | "media"

type Scene = {
  id: string
  name: string
  layout: Layout
  overlay: boolean
  lowerThird: boolean
  screenText: string
  screenTextPosition: "top" | "middle" | "bottom"
}

const LAYOUTS: Array<{ id: Layout; name: string; description: string }> = [
  { id: "single", name: "Single", description: "One speaker fills the stage" },
  { id: "cropped", name: "Cropped", description: "Wide presenter framing" },
  { id: "group", name: "Group", description: "Presenter plus guest tiles" },
  { id: "spotlight", name: "Spotlight", description: "Presenter emphasis" },
  { id: "news", name: "News", description: "Presenter and screen split" },
  { id: "screen", name: "Screen", description: "Shared screen dominates" },
  { id: "pip", name: "Picture-in-picture", description: "Screen with presenter inset" },
  { id: "cinema", name: "Cinema", description: "Presentation without presenter tile" },
]

const DEFAULT_SCENES: Scene[] = [
  { id: "opening", name: "Opening", layout: "single", overlay: true, lowerThird: true, screenText: "WELCOME TO WIGOD LIVE", screenTextPosition: "top" },
  { id: "interview", name: "Interview", layout: "group", overlay: true, lowerThird: true, screenText: "", screenTextPosition: "bottom" },
  { id: "screen", name: "Screen Demo", layout: "pip", overlay: true, lowerThird: false, screenText: "", screenTextPosition: "bottom" },
  { id: "full", name: "Full Screen", layout: "cinema", overlay: false, lowerThird: false, screenText: "", screenTextPosition: "bottom" },
]

export function LiveStudio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const urlsRef = useRef<Set<string>>(new Set())

  const [camera, setCamera] = useState(false)
  const [mic, setMic] = useState(false)
  const [screen, setScreen] = useState(false)
  const [status, setStatus] = useState<"ready" | "previewing" | "live">("ready")
  const [error, setError] = useState("")
  const [micLevel, setMicLevel] = useState(0)
  const [cameraPermission, setCameraPermission] = useState<string>("unknown")
  const [micPermission, setMicPermission] = useState<string>("unknown")
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [cameraDeviceId, setCameraDeviceId] = useState("")
  const [micDeviceId, setMicDeviceId] = useState("")
  const [layout, setLayout] = useState<Layout>("single")
  const [panel, setPanel] = useState<Panel>("settings")
  const [showOverlay, setShowOverlay] = useState(true)
  const [liveStampOn, setLiveStampOn] = useState(true)
  const [timestampOn, setTimestampOn] = useState(true)
  const [liveClock, setLiveClock] = useState("")
  const [overlayUrl, setOverlayUrl] = useState("")
  const [overlayOpacity, setOverlayOpacity] = useState(100)
  const [logoUrl, setLogoUrl] = useState("")
  const [backgroundUrl, setBackgroundUrl] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [screenText, setScreenText] = useState("WELCOME TO WIGOD LIVE")
  const [screenTextPosition, setScreenTextPosition] = useState<"top" | "middle" | "bottom">("top")
  const [screenTextSize, setScreenTextSize] = useState("medium")
  const [lowerThird, setLowerThird] = useState(true)
  const [lowerName, setLowerName] = useState("WIGOD LIVE")
  const [lowerRole, setLowerRole] = useState("People. Places. Perspectives.")
  const [ticker, setTicker] = useState("")
  const [tickerOn, setTickerOn] = useState(false)
  const [headlineOn, setHeadlineOn] = useState(true)
  const [headlines, setHeadlines] = useState("BREAKING NEWS: WIGOD LIVE\nLATEST NEWS FROM AFRICA & BEYOND\nPEOPLE. PLACES. PERSPECTIVES.")
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [scenes, setScenes] = useState<Scene[]>(DEFAULT_SCENES)
  const [customSceneName, setCustomSceneName] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaName, setMediaName] = useState("")
  const [mediaPlaying, setMediaPlaying] = useState(false)

  const cameraDevices = devices.filter((device) => device.kind === "videoinput")
  const micDevices = devices.filter((device) => device.kind === "audioinput")

  useEffect(() => {
    void refreshDevices()
    void checkPermissions()

    const onDeviceChange = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange)
      stopAllMedia()
      if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current)
      audioContextRef.current?.close()
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    const updateClock = () => {
      setLiveClock(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()))
    }
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const items = headlines.split("\n").map((item) => item.trim()).filter(Boolean)
    if (items.length < 2 || !headlineOn) return
    const timer = window.setInterval(() => setHeadlineIndex((current) => (current + 1) % items.length), 6000)
    return () => window.clearInterval(timer)
  }, [headlines, headlineOn])

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const next = await navigator.mediaDevices.enumerateDevices()
      setDevices(next)
      const firstCamera = next.find((device) => device.kind === "videoinput")
      const firstMic = next.find((device) => device.kind === "audioinput")
      setCameraDeviceId((current) => current || firstCamera?.deviceId || "")
      setMicDeviceId((current) => current || firstMic?.deviceId || "")
    } catch {
      // Device enumeration can fail before media permissions are granted.
    }
  }

  async function checkPermissions() {
    if (!navigator.permissions?.query) return
    try {
      const cameraStatus = await navigator.permissions.query({ name: "camera" as PermissionName })
      setCameraPermission(cameraStatus.state)
    } catch {
      setCameraPermission("unknown")
    }
    try {
      const micStatus = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicPermission(micStatus.state)
    } catch {
      setMicPermission("unknown")
    }
  }

  function registerUrl(url: string) {
    urlsRef.current.add(url)
    return url
  }

  function replaceUrl(current: string, file: File) {
    if (current) {
      urlsRef.current.delete(current)
      URL.revokeObjectURL(current)
    }
    return registerUrl(URL.createObjectURL(file))
  }

  function handleAsset(event: ChangeEvent<HTMLInputElement>, setter: (url: string) => void, imageOnly = false) {
    const file = event.target.files?.[0]
    if (!file) return
    if (imageOnly && !file.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }
    const url = registerUrl(URL.createObjectURL(file))
    setter(url)
    setError("")
  }

  function startMeter(stream: MediaStream) {
    const track = stream.getAudioTracks()[0]
    if (!track) return

    try {
      audioContextRef.current?.close()
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const context = new AudioContextClass()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioContextRef.current = context
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) {
          const normalized = (value - 128) / 128
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / data.length)
        setMicLevel(Math.min(100, Math.max(0, Math.round(rms * 700))))
        meterFrameRef.current = requestAnimationFrame(tick)
      }

      void context.resume()
      tick()
    } catch {
      setMicLevel(0)
    }
  }

  async function toggleCamera() {
    setError("")

    if (camera) {
      cameraStreamRef.current?.getVideoTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = screen ? screenStreamRef.current : null
      setCamera(false)
      setStatus(screen ? "previewing" : audioStreamRef.current ? "previewing" : "ready")
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraDeviceId
          ? { deviceId: { exact: cameraDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      cameraStreamRef.current = stream

      const existingAudio = audioStreamRef.current?.getAudioTracks()[0]
      if (existingAudio) stream.addTrack(existingAudio)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play()
      }

      setCamera(true)
      setStatus("previewing")
      await refreshDevices()
      await checkPermissions()
      setError("")
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "NotAllowedError") {
        setError("Camera access was denied by the browser or Windows. Camera is allowed for this site, so check Windows Settings > Privacy & security > Camera and turn on Camera access, Let apps access your camera, and Let desktop apps access your camera.")
      } else if (cause instanceof DOMException && cause.name === "NotFoundError") {
        setError("WIGOD could not find a camera. Open Settings and choose another camera.")
      } else if (cause instanceof DOMException && cause.name === "NotReadableError") {
        setError("The camera is detected but cannot be opened. Close Camera, Teams, Zoom, OBS or another application using the camera, then try again.")
      } else if (cause instanceof DOMException && cause.name === "OverconstrainedError") {
        setError("The selected camera could not satisfy the requested settings. Choose another camera in Settings and try again.")
      } else {
        setError("WIGOD could not start the camera. Check Windows camera access and the selected device.")
      }
      await refreshDevices()
      await checkPermissions()
      setCamera(false)
    }
  }

  async function toggleMic() {
    setError("")

    if (mic) {
      audioStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      setMic(false)
      setMicLevel(0)
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported")

      let stream = audioStreamRef.current
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: micDeviceId ? { exact: micDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        audioStreamRef.current = stream
      }

      const track = stream.getAudioTracks()[0]
      if (!track) throw new Error("no-audio-track")
      track.enabled = true
      setMic(true)
      startMeter(stream)

      if (cameraStreamRef.current && !cameraStreamRef.current.getAudioTracks().some((item) => item.id === track.id)) {
        cameraStreamRef.current.addTrack(track)
      }

      await refreshDevices()
      await checkPermissions()
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "NotAllowedError") {
        setError("Microphone access was denied by the browser or Windows. Microphone is allowed for this site, so check Windows Settings > Privacy & security > Microphone and turn on Microphone access, Let apps access your microphone, and Let desktop apps access your microphone.")
      } else if (cause instanceof DOMException && cause.name === "NotFoundError") {
        setError("WIGOD could not find a microphone. Open Settings and choose another microphone.")
      } else if (cause instanceof DOMException && cause.name === "NotReadableError") {
        setError("The microphone is detected but cannot be opened. Close Teams, Zoom, OBS or another application using the microphone, then try again.")
      } else if (cause instanceof DOMException && cause.name === "OverconstrainedError") {
        setError("The selected microphone could not satisfy the requested settings. Choose another microphone in Settings and try again.")
      } else {
        setError("WIGOD could not start the microphone. Check Windows microphone access and the selected device.")
      }
      setMic(false)
      setMicLevel(0)
      await refreshDevices()
      await checkPermissions()
    }
  }

  async function shareScreen() {
    setError("")
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("unsupported")
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })

      const micTrack = audioStreamRef.current?.getAudioTracks()[0]
      if (micTrack && micTrack.enabled) displayStream.addTrack(micTrack)

      screenStreamRef.current = displayStream

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream
        videoRef.current.muted = true
        await videoRef.current.play()
      }

      setScreen(true)
      setStatus("previewing")
      setCamera(false)

      const screenTrack = displayStream.getVideoTracks()[0]
      screenTrack.addEventListener("ended", () => {
        screenStreamRef.current = null
        setScreen(false)

        if (cameraStreamRef.current) {
          setCamera(true)
          if (videoRef.current) videoRef.current.srcObject = cameraStreamRef.current
          setStatus("previewing")
        } else {
          if (videoRef.current) videoRef.current.srcObject = null
          setStatus(audioStreamRef.current ? "previewing" : "ready")
        }
      })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      setError("Screen sharing could not be started. Please try again.")
    }
  }

  function stopAllMedia() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    audioStreamRef.current = null
    screenStreamRef.current = null
  }

  function applyScene(scene: Scene) {
    setLayout(scene.layout)
    setShowOverlay(scene.overlay)
    setLowerThird(scene.lowerThird)
    setScreenText(scene.screenText)
    setScreenTextPosition(scene.screenTextPosition)
  }

  function saveCustomScene() {
    const name = customSceneName.trim()
    if (!name) return
    setScenes((current) => [
      ...current,
      {
        id: "custom-" + Date.now(),
        name,
        layout,
        overlay: showOverlay,
        lowerThird,
        screenText,
        screenTextPosition,
      },
    ])
    setCustomSceneName("")
  }

  const positionClass =
    screenTextPosition === "top"
      ? "top-3"
      : screenTextPosition === "middle"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-3"

  const textSizeClass =
    screenTextSize === "large" ? "text-2xl" : screenTextSize === "small" ? "text-sm" : "text-lg"

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD Live Studio</p>
            <h2 className="mt-1 font-serif text-xl font-bold">Professional broadcast workspace</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Camera, microphone, screen share, scenes, layouts, branding, overlays, lower thirds and ticker controls in one browser studio.
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold">
            {status === "live" ? "● Live" : "● " + status}
          </span>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand-red/30 bg-brand-red/5 p-3 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand-red" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.45fr)]">
        <section className="space-y-4">
          <div
            className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-sm"
            style={backgroundUrl ? { backgroundImage: "url(" + backgroundUrl + ")", backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {layout === "group" || layout === "news" || layout === "pip" ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                  className={
                    layout === "pip"
                      ? "absolute inset-0"
                      : layout === "news"
                        ? "grid h-full w-full grid-cols-[1.5fr_1fr] gap-2"
                        : "grid h-full w-full grid-cols-2 gap-2"
                  }
                >
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    className={layout === "pip" ? "size-full object-cover" : "min-h-0 w-full rounded-xl bg-black object-cover"}
                  />
                  {layout !== "pip" ? (
                    <div className="flex items-center justify-center rounded-xl bg-black/45 p-3 text-center text-white">
                      <div>
                        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-white/15">
                          <Radio className="size-5" />
                        </div>
                        <p className="mt-2 text-xs font-bold">{layout === "news" ? "Shared screen" : "Guest / co-host"}</p>
                        <p className="mt-1 text-[10px] text-white/60">Ready to add to the stage</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 right-3 h-28 w-40 overflow-hidden rounded-xl border-2 border-white/70 bg-black">
                      <video
                        muted
                        playsInline
                        autoPlay
                        src={screen ? undefined : undefined}
                        className="size-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">Presenter</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className={"size-full object-cover " + (layout === "cropped" ? "scale-110" : "")}
              />
            )}

            {!camera && !screen && !mediaPlaying ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <Video className="size-10 opacity-70" />
                <p className="mt-2 text-sm font-semibold">WIGOD Live preview</p>
                <p className="mt-1 max-w-xs text-xs text-white/60">Turn on your camera, share your screen or play media.</p>
              </div>
            ) : null}

            {mediaPlaying && mediaUrl ? (
              <video
                src={mediaUrl}
                autoPlay
                controls
                className="absolute inset-0 size-full bg-black object-contain"
                onEnded={() => setMediaPlaying(false)}
              />
            ) : null}

            {liveStampOn ? (
              <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-md bg-black/80 px-2.5 py-1.5 text-[11px] font-black tracking-wider text-white shadow-sm">
                <span className="size-2 animate-pulse rounded-full bg-brand-red" />
                LIVE
              </div>
            ) : null}

            {logoUrl ? (
              <img src={logoUrl} alt="WIGOD logo" className="absolute right-3 top-3 z-20 h-12 w-12 rounded object-contain" />
            ) : null}

            {timestampOn && liveClock ? (
              <div className="pointer-events-none absolute right-3 top-[4.25rem] z-30 rounded-md bg-black/75 px-2.5 py-1 text-[10px] font-bold tabular-nums text-white">
                {liveClock}
              </div>
            ) : null}

            {showOverlay && overlayUrl ? (
              <img
                src={overlayUrl}
                alt=""
                className="pointer-events-none absolute inset-0 z-10 size-full object-cover"
                style={{ opacity: overlayOpacity / 100 }}
              />
            ) : null}

            {showOverlay && !overlayUrl ? (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute left-0 top-0 h-2 w-full bg-brand-green" />
                <div className="absolute right-0 top-0 h-2 w-1/3 bg-brand-red" />
              </div>
            ) : null}

            {screenText ? (
              <div className={"pointer-events-none absolute left-3 right-3 z-30 " + positionClass}>
                <div className={"mx-auto w-fit max-w-full rounded-lg bg-black/75 px-4 py-2 text-center font-black tracking-wide text-white " + textSizeClass}>
                  {screenText}
                </div>
              </div>
            ) : null}

            {lowerThird ? (
              <div className="pointer-events-none absolute bottom-12 left-3 z-30 max-w-[75%] overflow-hidden rounded-lg border-l-4 border-brand-green bg-black/80 px-4 py-2 text-white">
                <p className="text-sm font-black">{lowerName || "WIGOD LIVE"}</p>
                <p className="mt-0.5 text-[10px] text-white/70">{lowerRole}</p>
              </div>
            ) : null}

            {headlineOn && headlines.trim() ? (
              <div className="pointer-events-none absolute bottom-8 left-0 right-0 z-40 flex min-h-7 overflow-hidden bg-black/90 text-white">
                <div className="shrink-0 bg-brand-green px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">HEADLINES</div>
                <div className="min-w-0 flex-1 px-3 py-1.5 text-[10px] font-bold">
                  {(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}
                </div>
              </div>
            ) : null}

            {tickerOn && ticker ? (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-50 overflow-hidden bg-brand-red px-3 py-2 text-[11px] font-bold text-white">
                <div className="animate-[wigodTicker_18s_linear_infinite] whitespace-nowrap">{ticker}</div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
              type="button"
              onClick={toggleCamera}
              className={"inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white " + (camera ? "bg-brand-green" : "bg-brand-red")}
            >
              {camera ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
              {camera ? "Camera on" : "Camera off"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={"inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white " + (mic ? "bg-brand-green" : "bg-brand-red")}
            >
              {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {mic ? "Mic on" : "Mic muted"}
            </button>

            <button type="button" onClick={shareScreen} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-bold">
              <MonitorUp className="size-4" />
              {screen ? "Screen sharing" : "Share screen"}
            </button>

            <button type="button" onClick={() => setPanel("layout")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-bold">
              <LayoutPanelTop className="size-4" />
              Layouts
            </button>

            <button type="button" onClick={() => setPanel("brand")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-bold">
              <Layers3 className="size-4" />
              Brand
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mic level</span>
                <span className="text-[10px] font-semibold tabular-nums">{micLevel}%</span>
              </div>
              <div className="mt-2 flex h-2 gap-0.5">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={index} className={"flex-1 rounded-sm " + (micLevel >= ((index + 1) / 16) * 100 ? "bg-brand-green" : "bg-secondary")} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camera permission</p>
              <p className={"mt-1 text-xs font-semibold " + (cameraPermission === "granted" ? "text-brand-green" : cameraPermission === "denied" ? "text-brand-red" : "text-muted-foreground")}>{cameraPermission}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Microphone permission</p>
              <p className={"mt-1 text-xs font-semibold " + (micPermission === "granted" ? "text-brand-green" : micPermission === "denied" ? "text-brand-red" : "text-muted-foreground")}>{micPermission}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-brand-red" />
              <div>
                <h3 className="text-sm font-bold">WIGOD Live</h3>
                <p className="text-xs text-muted-foreground">Native WIGOD destination</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              WIGOD is the primary destination. YouTube remains an optional publishing connection. Facebook and TikTok are not required destinations.
            </p>
            <button type="button" onClick={() => setStatus("live")} disabled={!camera && !screen && !mediaPlaying} className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
              Start WIGOD Live
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">The browser studio preview is functional. A production WebRTC/media-server transport is still required for remote viewers.</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-background p-2">
            {([
              ["settings", "Settings"],
              ["brand", "Brand"],
              ["layout", "Layouts"],
              ["scenes", "Scenes"],
              ["media", "Media"],
            ] as Array<[Panel, string]>).map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className={"rounded-xl px-3 py-2 text-xs font-bold " + (panel === id ? "bg-brand-green text-white" : "hover:bg-secondary")}
              >
                {name}
              </button>
            ))}
          </div>

          {panel === "settings" ? (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4" />
                <h3 className="text-sm font-bold">Camera & audio</h3>
              </div>

              <div>
                <label className="text-xs font-semibold">Camera</label>
                <select value={cameraDeviceId} onChange={(event) => setCameraDeviceId(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs">
                  {cameraDevices.length === 0 ? <option value="">No camera detected</option> : cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Camera " + (index + 1)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Microphone</label>
                <select value={micDeviceId} onChange={(event) => setMicDeviceId(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs">
                  {micDevices.length === 0 ? <option value="">No microphone detected</option> : micDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone " + (index + 1)}</option>)}
                </select>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-brand-green" />
                  <p className="text-xs font-bold">Automatic audio processing</p>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Echo cancellation, noise suppression and automatic gain control are requested when WIGOD opens your mic.</p>
              </div>

              <button type="button" onClick={() => { void refreshDevices(); void checkPermissions() }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold">
                <RefreshCw className="size-3.5" /> Refresh devices & permissions
              </button>

              <div className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-3 text-[10px] leading-4">
                <p className="font-bold text-foreground">Camera/mic blocked?</p>
                <p className="mt-1 text-muted-foreground">Use the site-info/lock icon beside the browser address bar, set Camera and Microphone to Allow, then refresh WIGOD. Windows also needs Camera access and Microphone access enabled for desktop apps.</p>
              </div>
            </div>
          ) : null}

          {panel === "brand" ? (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Layers3 className="size-4" />
                <h3 className="text-sm font-bold">Brand assets</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-xl border border-border p-3 text-center text-[11px] font-semibold hover:bg-secondary">
                  <ImageIcon className="mx-auto size-4 text-brand-green" />
                  <span className="mt-1 block">Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, setLogoUrl, true)} />
                </label>
                <label className="cursor-pointer rounded-xl border border-border p-3 text-center text-[11px] font-semibold hover:bg-secondary">
                  <Layers3 className="mx-auto size-4 text-brand-red" />
                  <span className="mt-1 block">Overlay</span>
                  <input type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={(event) => handleAsset(event, setOverlayUrl, true)} />
                </label>
                <label className="cursor-pointer rounded-xl border border-border p-3 text-center text-[11px] font-semibold hover:bg-secondary">
                  <ImageIcon className="mx-auto size-4 text-brand-green" />
                  <span className="mt-1 block">Background</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, setBackgroundUrl, true)} />
                </label>
                <label className="cursor-pointer rounded-xl border border-border p-3 text-center text-[11px] font-semibold hover:bg-secondary">
                  <ImageIcon className="mx-auto size-4 text-brand-green" />
                  <span className="mt-1 block">Thumbnail</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, setThumbnailUrl, true)} />
                </label>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xs font-bold">Broadcast graphics</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>LIVE stamp</span><input type="checkbox" checked={liveStampOn} onChange={(event) => setLiveStampOn(event.target.checked)} /></label>
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>Time stamp</span><input type="checkbox" checked={timestampOn} onChange={(event) => setTimestampOn(event.target.checked)} /></label>
                  <label className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>News headlines</span><input type="checkbox" checked={headlineOn} onChange={(event) => setHeadlineOn(event.target.checked)} /></label>
                </div>
                <textarea value={headlines} onChange={(event) => { setHeadlines(event.target.value); setHeadlineIndex(0) }} rows={4} placeholder="One headline per line" className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <p className="mt-1 text-[9px] text-muted-foreground">Headlines rotate automatically every 6 seconds. Use one headline per line.</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                <div>
                  <p className="text-xs font-bold">Overlay</p>
                  <p className="text-[10px] text-muted-foreground">{overlayUrl ? "Custom overlay loaded" : "WIGOD frame overlay"}</p>
                </div>
                <input type="checkbox" checked={showOverlay} onChange={(event) => setShowOverlay(event.target.checked)} />
              </div>

              {overlayUrl ? (
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Overlay opacity</span>
                    <span>{overlayOpacity}%</span>
                  </div>
                  <input type="range" min="20" max="100" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="mt-2 w-full" />
                </div>
              ) : null}

              {thumbnailUrl ? <div className="rounded-xl border border-border p-2"><img src={thumbnailUrl} alt="Live thumbnail preview" className="aspect-video w-full rounded-lg object-cover" /></div> : null}
              {logoUrl ? <div className="rounded-xl border border-border p-2"><img src={logoUrl} alt="WIGOD logo preview" className="mx-auto h-16 w-16 object-contain" /></div> : null}

              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xs font-bold">Lower third</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Show lower third</span>
                  <input type="checkbox" checked={lowerThird} onChange={(event) => setLowerThird(event.target.checked)} />
                </div>
                <input value={lowerName} onChange={(event) => setLowerName(event.target.value)} placeholder="Name / show title" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <input value={lowerRole} onChange={(event) => setLowerRole(event.target.value)} placeholder="Role / subtitle" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <Type className="size-4 text-brand-green" />
                  <p className="text-xs font-bold">Screen text</p>
                </div>
                <input value={screenText} onChange={(event) => setScreenText(event.target.value)} placeholder="Headline or name" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select value={screenTextPosition} onChange={(event) => setScreenTextPosition(event.target.value as typeof screenTextPosition)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px]">
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select value={screenTextSize} onChange={(event) => setScreenTextSize(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px]">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">Scrolling ticker</p>
                  <input type="checkbox" checked={tickerOn} onChange={(event) => setTickerOn(event.target.checked)} />
                </div>
                <input value={ticker} onChange={(event) => setTicker(event.target.value)} placeholder="Breaking: add your scrolling ticker..." className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
              </div>
            </div>
          ) : null}

          {panel === "layout" ? (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <LayoutPanelTop className="size-4" />
                <h3 className="text-sm font-bold">Layouts</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUTS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setLayout(item.id)} className={"rounded-xl border p-3 text-left " + (layout === item.id ? "border-brand-green bg-brand-green/5" : "border-border hover:bg-secondary")}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{item.name}</span>
                      {layout === item.id ? <Check className="size-3.5 text-brand-green" /> : null}
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{item.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground">Layouts are designed as reusable stage arrangements and can be changed while previewing.</p>
            </div>
          ) : null}

          {panel === "scenes" ? (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Clapperboard className="size-4" />
                <h3 className="text-sm font-bold">Scenes</h3>
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground">Save a whole look and switch it in one tap during a show.</p>
              <div className="space-y-2">
                {scenes.map((scene) => (
                  <button key={scene.id} type="button" onClick={() => applyScene(scene)} className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-3 text-left hover:bg-secondary">
                    <span>
                      <span className="block text-xs font-bold">{scene.name}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{LAYOUTS.find((item) => item.id === scene.layout)?.name ?? scene.layout}</span>
                    </span>
                    <ChevronDown className="size-3.5 -rotate-90 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xs font-bold">Save current setup as a scene</p>
                <div className="mt-2 flex gap-2">
                  <input value={customSceneName} onChange={(event) => setCustomSceneName(event.target.value)} placeholder="Scene name" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs" />
                  <button type="button" onClick={saveCustomScene} className="rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white">Save</button>
                </div>
              </div>
            </div>
          ) : null}

          {panel === "media" ? (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand-red" />
                <h3 className="text-sm font-bold">Media clips</h3>
              </div>
              <label className="cursor-pointer rounded-xl border border-dashed border-border p-4 text-center block hover:bg-secondary">
                <Video className="mx-auto size-5 text-brand-green" />
                <p className="mt-2 text-xs font-bold">Add intro, countdown or outro video</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Local preview in the Studio</p>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (mediaUrl) {
                      urlsRef.current.delete(mediaUrl)
                      URL.revokeObjectURL(mediaUrl)
                    }
                    setMediaUrl(registerUrl(URL.createObjectURL(file)))
                    setMediaName(file.name)
                    setMediaPlaying(false)
                  }}
                />
              </label>
              {mediaUrl ? (
                <div className="rounded-xl border border-border p-3">
                  <p className="truncate text-xs font-bold">{mediaName}</p>
                  <button type="button" onClick={() => setMediaPlaying(true)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white">
                    <Video className="size-3.5" /> Play on stage
                  </button>
                </div>
              ) : null}
              <p className="text-[10px] leading-4 text-muted-foreground">StreamYard uses media assets for intros, countdowns, outros and visual inserts; WIGOD now has the same studio-side workflow for local preview.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
