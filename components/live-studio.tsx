"use client"

import Script from "next/script"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { WigodGraphicsPreview } from "./wigod-graphics-preview"
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
  | "camera"
  | "media"
  | "split"
  | "custom"

type Panel = "settings" | "brand" | "layout" | "scenes" | "media"
type BannerLayout = "lower-third" | "full-width" | "split" | "pill" | "corner" | "headline"

declare global {
  interface Window {
    LivekitClient?: {
      Room: new (options?: Record<string, unknown>) => any
      Track: { Source: { Camera: string; Microphone: string; ScreenShare: string } }
    }
  }
}

type BackgroundOption = { id: string; name: string; kind: "picture" | "video"; url: string }

const STUDIO_BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "studio-green", name: "WIGOD Green Studio", kind: "picture", url: "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#062b1c'/><stop offset='.55' stop-color='#0f8f4f'/><stop offset='1' stop-color='#03140d'/></linearGradient></defs><rect width='1280' height='720' fill='url(#g)'/><circle cx='1040' cy='150' r='260' fill='#ffffff' opacity='.06'/><circle cx='180' cy='620' r='320' fill='#d62828' opacity='.07'/><text x='640' y='390' text-anchor='middle' fill='#ffffff' opacity='.12' font-family='Arial' font-size='74' font-weight='700'>WIGOD LIVE</text></svg>") },
  { id: "studio-news", name: "Newsroom", kind: "picture", url: "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'><stop stop-color='#070b14'/><stop offset='.5' stop-color='#182235'/><stop offset='1' stop-color='#070b14'/></linearGradient></defs><rect width='1280' height='720' fill='url(#g)'/><path d='M0 560 L1280 420 L1280 720 L0 720Z' fill='#d62828' opacity='.13'/><path d='M0 0 L1280 0 L1280 180 L0 300Z' fill='#0f8f4f' opacity='.12'/><text x='640' y='390' text-anchor='middle' fill='#ffffff' opacity='.16' font-family='Arial' font-size='68' font-weight='700'>NEWSROOM</text></svg>") },
  { id: "studio-dark", name: "Dark Broadcast", kind: "picture", url: "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><radialGradient id='g'><stop stop-color='#303642'/><stop offset='1' stop-color='#050608'/></radialGradient></defs><rect width='1280' height='720' fill='url(#g)'/><rect x='70' y='70' width='1140' height='580' rx='30' fill='none' stroke='#ffffff' stroke-opacity='.08' stroke-width='3'/><text x='640' y='390' text-anchor='middle' fill='#ffffff' opacity='.13' font-family='Arial' font-size='62' font-weight='700'>BROADCAST STUDIO</text></svg>") },
  { id: "motion", name: "Motion Background", kind: "video", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
]

type Scene = {
  id: string
  name: string
  layout: Layout
  overlay: boolean
  lowerThird: boolean
  screenText: string
  screenTextPosition: "top" | "middle" | "bottom"
  primaryColor: string
  accentColor: string
  bannerColor: string
  bannerTextColor: string
  bannerLayout: BannerLayout
  bannerRadius: "square" | "rounded" | "pill"
  tickerColor: string
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
  { id: "camera", name: "Camera only", description: "Camera fills the stage" },
  { id: "media", name: "Media only", description: "Video fills the stage" },
  { id: "split", name: "Camera + media", description: "Camera and video side by side" },
  { id: "custom", name: "Custom", description: "Position, size and crop camera + media" },
]

const DEFAULT_SCENES: Scene[] = [
  { id: "opening", name: "Opening", layout: "single", overlay: true, lowerThird: true, screenText: "WELCOME TO WIGOD LIVE", screenTextPosition: "top", primaryColor: "#0f8f4f", accentColor: "#d62828", bannerColor: "#111111", bannerTextColor: "#ffffff", bannerLayout: "lower-third", bannerRadius: "rounded", tickerColor: "#d62828" },
  { id: "interview", name: "Interview", layout: "group", overlay: true, lowerThird: true, screenText: "", screenTextPosition: "bottom", primaryColor: "#2563eb", accentColor: "#7c3aed", bannerColor: "#111827", bannerTextColor: "#ffffff", bannerLayout: "split", bannerRadius: "rounded", tickerColor: "#2563eb" },
  { id: "screen", name: "Screen Demo", layout: "pip", overlay: true, lowerThird: false, screenText: "", screenTextPosition: "bottom", primaryColor: "#0f8f4f", accentColor: "#f59e0b", bannerColor: "#0b1220", bannerTextColor: "#ffffff", bannerLayout: "pill", bannerRadius: "pill", tickerColor: "#0f8f4f" },
  { id: "full", name: "Full Screen", layout: "cinema", overlay: false, lowerThird: false, screenText: "", screenTextPosition: "bottom", primaryColor: "#111111", accentColor: "#ffffff", bannerColor: "#111111", bannerTextColor: "#ffffff", bannerLayout: "headline", bannerRadius: "square", tickerColor: "#111111" },
]

export function LiveStudio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaVideoRef = useRef<HTMLVideoElement>(null)
  const micBeforeMediaRef = useRef(false)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const urlsRef = useRef<Set<string>>(new Set())
  const preferencesLoadedRef = useRef(false)
  const liveRoomRef = useRef<any>(null)
  const liveRoomNameRef = useRef("")

  const [camera, setCamera] = useState(false)
  const [mic, setMic] = useState(false)
  const [screen, setScreen] = useState(false)
  const [status, setStatus] = useState<"ready" | "previewing" | "live">("ready")
  const [error, setError] = useState("")
  const [liveSdkReady, setLiveSdkReady] = useState(false)
  const [liveRoomName, setLiveRoomName] = useState("")
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
  const [broadcastTimeOn, setBroadcastTimeOn] = useState(true)
  const [liveClock, setLiveClock] = useState("")
  const [mediaElapsed, setMediaElapsed] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [overlayUrl, setOverlayUrl] = useState("")
  const [overlayOpacity, setOverlayOpacity] = useState(100)
  const [logoUrl, setLogoUrl] = useState("")
  const [backgroundUrl, setBackgroundUrl] = useState("")
  const [backgroundKind, setBackgroundKind] = useState<"picture" | "video" | "">("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [screenText, setScreenText] = useState("WELCOME TO WIGOD LIVE")
  const [screenTextOn, setScreenTextOn] = useState(false)
  const [screenTextPosition, setScreenTextPosition] = useState<"top" | "middle" | "bottom">("top")
  const [screenTextSize, setScreenTextSize] = useState("medium")
  const [lowerThird, setLowerThird] = useState(false)
  const [lowerName, setLowerName] = useState("WIGOD LIVE")
  const [lowerRole, setLowerRole] = useState("People. Places. Perspectives.")
  const [primaryColor, setPrimaryColor] = useState("#0f8f4f")
  const [accentColor, setAccentColor] = useState("#d62828")
  const [bannerColor, setBannerColor] = useState("#111111")
  const [bannerTextColor, setBannerTextColor] = useState("#ffffff")
  const [bannerLayout, setBannerLayout] = useState<BannerLayout>("lower-third")
  const [bannerRadius, setBannerRadius] = useState<"square" | "rounded" | "pill">("rounded")
  const [tickerColor, setTickerColor] = useState("#d62828")
  const [tickerSpeed, setTickerSpeed] = useState(36)
  const [tickerHeight, setTickerHeight] = useState("small")
  const [ticker, setTicker] = useState("Africa & Beyond — News | Analysis | Perspective")
  const [tickerOn, setTickerOn] = useState(true)
  const [headlineOn, setHeadlineOn] = useState(true)
  const [headlines, setHeadlines] = useState("BREAKING NEWS: WIGOD LIVE\nLATEST NEWS FROM AFRICA & BEYOND\nPEOPLE. PLACES. PERSPECTIVES.")
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [scenes, setScenes] = useState<Scene[]>(DEFAULT_SCENES)
  const [customSceneName, setCustomSceneName] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaName, setMediaName] = useState("")
  const [mediaPlaying, setMediaPlaying] = useState(false)
  const [mediaMicMuted, setMediaMicMuted] = useState(false)
  const [customCameraSide, setCustomCameraSide] = useState<"left" | "right">("left")
  const [customCameraWidth, setCustomCameraWidth] = useState(45)
  const [customCameraZoom, setCustomCameraZoom] = useState(100)
  const [customMediaZoom, setCustomMediaZoom] = useState(100)
  const [customCameraPosition, setCustomCameraPosition] = useState("center")
  const [customMediaPosition, setCustomMediaPosition] = useState("center")

  const cameraDevices = devices.filter((device) => device.kind === "videoinput")
  const micDevices = devices.filter((device) => device.kind === "audioinput")

  useEffect(() => {
    void refreshDevices()
    void checkPermissions()

    const onDeviceChange = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange)
      void endWigodLive()
      stopAllMedia()
      if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current)
      audioContextRef.current?.close()
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("wigod-live-studio-preferences")
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>
        const graphicsDefaultsVersion = typeof saved.graphicsDefaultsVersion === "number" ? saved.graphicsDefaultsVersion : 0
        if (typeof saved.layout === "string") setLayout(saved.layout as Layout)
        if (typeof saved.panel === "string") setPanel(saved.panel as Panel)
        if (graphicsDefaultsVersion >= 2) {
          if (typeof saved.showOverlay === "boolean") setShowOverlay(saved.showOverlay)
            if (typeof saved.liveStampOn === "boolean") setLiveStampOn(saved.liveStampOn)
          if (typeof saved.broadcastTimeOn === "boolean") setBroadcastTimeOn(saved.broadcastTimeOn)
          if (typeof saved.screenTextOn === "boolean") setScreenTextOn(saved.screenTextOn)
          if (typeof saved.lowerThird === "boolean") setLowerThird(saved.lowerThird)
          if (typeof saved.tickerOn === "boolean") setTickerOn(saved.tickerOn)
          if (typeof saved.headlineOn === "boolean") setHeadlineOn(saved.headlineOn)
        }
        if (typeof saved.overlayOpacity === "number") setOverlayOpacity(saved.overlayOpacity)
        if (typeof saved.screenText === "string") setScreenText(saved.screenText)
        if (typeof saved.screenTextPosition === "string") setScreenTextPosition(saved.screenTextPosition as typeof screenTextPosition)
        if (typeof saved.screenTextSize === "string") setScreenTextSize(saved.screenTextSize)
        if (typeof saved.lowerName === "string") setLowerName(saved.lowerName)
        if (typeof saved.lowerRole === "string") setLowerRole(saved.lowerRole)
        if (typeof saved.primaryColor === "string") setPrimaryColor(saved.primaryColor)
        if (typeof saved.accentColor === "string") setAccentColor(saved.accentColor)
        if (typeof saved.bannerColor === "string") setBannerColor(saved.bannerColor)
        if (typeof saved.bannerTextColor === "string") setBannerTextColor(saved.bannerTextColor)
        if (typeof saved.bannerLayout === "string") setBannerLayout(saved.bannerLayout as BannerLayout)
        if (typeof saved.bannerRadius === "string") setBannerRadius(saved.bannerRadius as typeof bannerRadius)
        if (typeof saved.tickerColor === "string") setTickerColor(saved.tickerColor)
        if (typeof saved.tickerSpeed === "number") setTickerSpeed(Math.max(18, Math.min(60, saved.tickerSpeed)))
        if (typeof saved.tickerHeight === "string") setTickerHeight(saved.tickerHeight)
        if (typeof saved.ticker === "string") setTicker(saved.ticker)
        if (typeof saved.headlines === "string") setHeadlines(saved.headlines)
        if (Array.isArray(saved.scenes)) setScenes(saved.scenes as Scene[])
        if (typeof saved.customCameraSide === "string") setCustomCameraSide(saved.customCameraSide as "left" | "right")
        if (typeof saved.customCameraWidth === "number") setCustomCameraWidth(saved.customCameraWidth)
        if (typeof saved.customCameraZoom === "number") setCustomCameraZoom(saved.customCameraZoom)
        if (typeof saved.customMediaZoom === "number") setCustomMediaZoom(saved.customMediaZoom)
        if (typeof saved.customCameraPosition === "string") setCustomCameraPosition(saved.customCameraPosition)
        if (typeof saved.customMediaPosition === "string") setCustomMediaPosition(saved.customMediaPosition)
        if (typeof saved.logoUrl === "string") setLogoUrl(saved.logoUrl)
        if (typeof saved.overlayUrl === "string") setOverlayUrl(saved.overlayUrl)
        if (typeof saved.backgroundUrl === "string") setBackgroundUrl(saved.backgroundUrl)
        if (saved.backgroundKind === "picture" || saved.backgroundKind === "video") setBackgroundKind(saved.backgroundKind)
        if (typeof saved.thumbnailUrl === "string") setThumbnailUrl(saved.thumbnailUrl)
        if (typeof saved.avatarUrl === "string") setAvatarUrl(saved.avatarUrl)
      }
    } catch {
      // Ignore invalid or unavailable browser preferences.
    }
    preferencesLoadedRef.current = true
  }, [])

  useEffect(() => {
    const mediaDetail = {
      camera: cameraStreamRef.current,
      microphone: audioStreamRef.current,
      screen: screenStreamRef.current
    }
    ;(window as Window & { __wigodStudioMedia?: typeof mediaDetail }).__wigodStudioMedia = mediaDetail
    window.dispatchEvent(new CustomEvent("wigod-studio-media", { detail: mediaDetail }))
  }, [camera, mic, screen])

  useEffect(() => {
    const graphics = {
      layout,
      screenText,
      screenTextOn,
      screenTextPosition,
      liveStampOn,
      broadcastTimeOn,
      liveClock,
      lowerThird,
      lowerName,
      lowerRole,
      primaryColor,
      accentColor,
      bannerColor,
      bannerTextColor,
      tickerColor,
      tickerSpeed,
      ticker,
      tickerOn,
      tickerHeight,
      headlineOn,
      headlines,
      headlineIndex,
      logoUrl,
      backgroundUrl,
      backgroundKind,
      mediaUrl,
      mediaPlaying,
      customCameraSide,
      customCameraWidth,
      customCameraZoom,
      customMediaZoom,
      customCameraPosition,
      customMediaPosition
    }
    ;(window as Window & { __wigodStudioGraphics?: typeof graphics }).__wigodStudioGraphics = graphics
    window.dispatchEvent(new CustomEvent("wigod-studio-graphics", { detail: graphics }))
  }, [
    layout, showOverlay, screenText, screenTextOn, screenTextPosition,
    lowerThird, lowerName, lowerRole, primaryColor, accentColor, bannerColor, bannerTextColor,
    bannerLayout, bannerRadius, tickerColor, tickerSpeed, ticker, tickerOn, headlineOn, headlines,
    headlineIndex, logoUrl, overlayUrl, backgroundUrl, backgroundKind, thumbnailUrl, avatarUrl,
    mediaUrl, mediaName, mediaPlaying, liveStampOn, broadcastTimeOn, liveClock, overlayOpacity, tickerHeight, customCameraSide, customCameraWidth, customCameraZoom,
    customMediaZoom, customCameraPosition, customMediaPosition
  ])

  useEffect(() => {
    if (!preferencesLoadedRef.current) return
    try {
      window.localStorage.setItem("wigod-live-studio-preferences", JSON.stringify({
        layout, panel, showOverlay, liveStampOn, broadcastTimeOn, overlayOpacity, screenText, screenTextOn, screenTextPosition, screenTextSize, lowerThird, lowerName, lowerRole,
        primaryColor, accentColor, bannerColor, bannerTextColor, bannerLayout, bannerRadius,
        tickerColor, tickerSpeed, tickerHeight, ticker, tickerOn, headlineOn, headlines, scenes, graphicsDefaultsVersion: 3,
        customCameraSide, customCameraWidth, customCameraZoom, customMediaZoom,
        customCameraPosition, customMediaPosition, logoUrl, overlayUrl, backgroundUrl, backgroundKind, thumbnailUrl, avatarUrl
      }))
    } catch {
      // Storage can be unavailable or full; never break the studio.
    }
  }, [
    layout, panel, showOverlay, liveStampOn, broadcastTimeOn, overlayOpacity, screenText, screenTextOn, screenTextPosition, screenTextSize, lowerThird, lowerName, lowerRole,
    primaryColor, accentColor, bannerColor, bannerTextColor, bannerLayout, bannerRadius,
    tickerColor, tickerSpeed, tickerHeight, ticker, tickerOn, headlineOn, headlines, scenes,
    customCameraSide, customCameraWidth, customCameraZoom, customMediaZoom,
    customCameraPosition, customMediaPosition, logoUrl, overlayUrl, backgroundUrl, backgroundKind, thumbnailUrl, avatarUrl
  ])

  useEffect(() => {
    if (!videoRef.current) return
    const stream = screen ? screenStreamRef.current : camera ? cameraStreamRef.current : null
    videoRef.current.srcObject = stream
    if (stream) void videoRef.current.play().catch(() => {})
  }, [layout, camera, screen, mediaPlaying])

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

  useEffect(() => {
    if (!mediaPlaying) return
    const timer = window.setInterval(() => {
      const player = mediaVideoRef.current
      if (!player) return
      setMediaElapsed(player.currentTime || 0)
      setMediaDuration(Number.isFinite(player.duration) ? player.duration : 0)
    }, 200)
    return () => window.clearInterval(timer)
  }, [mediaPlaying, mediaUrl])

  useEffect(() => {
    if (!mediaPlaying) {
      setMediaMicMuted(false)
      if (micBeforeMediaRef.current && audioStreamRef.current) {
        const track = audioStreamRef.current.getAudioTracks()[0]
        if (track) {
          track.enabled = true
          setMic(true)
          startMeter(audioStreamRef.current)
        }
      }
      micBeforeMediaRef.current = false
      return
    }

    micBeforeMediaRef.current = mic
    if (mic) {
      audioStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false })
      setMic(false)
      setMicLevel(0)
      setMediaMicMuted(true)
    }
  }, [mediaPlaying])

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

  async function handleAsset(event: ChangeEvent<HTMLInputElement>, setter: (url: string) => void, imageOnly = false) {
    const file = event.target.files?.[0]
    if (!file) return
    if (imageOnly && !file.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("asset-read-failed"))
        reader.readAsDataURL(file)
      })
      setter(dataUrl)
      setError("")
    } catch {
      setError("WIGOD could not save that graphic. Please choose the file again.")
    }
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
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },      })

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
      audioStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false })
      setMic(false)
      setMicLevel(0)
      if (mediaPlaying) setMediaMicMuted(true)
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
      setMediaMicMuted(false)
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

  function stopScreenSharing() {
    const displayStream = screenStreamRef.current
    screenStreamRef.current = null
    displayStream?.getTracks().forEach((track) => track.stop())

    setScreen(false)

    if (cameraStreamRef.current) {
      setCamera(true)
      if (videoRef.current) videoRef.current.srcObject = cameraStreamRef.current
      setStatus("previewing")
    } else {
      if (videoRef.current) videoRef.current.srcObject = null
      setStatus(audioStreamRef.current ? "previewing" : "ready")
    }
  }

  async function shareScreen() {
    setError("")
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("unsupported")
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })

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
        if (screenStreamRef.current !== displayStream) return
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

  function toggleScreenSharing() {
    if (screenStreamRef.current) {
      stopScreenSharing()
      return
    }
    void shareScreen()
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
    setPrimaryColor(scene.primaryColor)
    setAccentColor(scene.accentColor)
    setBannerColor(scene.bannerColor)
    setBannerTextColor(scene.bannerTextColor)
    setBannerLayout(scene.bannerLayout)
    setBannerRadius(scene.bannerRadius)
    setTickerColor(scene.tickerColor)

    ;(window as Window & { __wigodStudioScene?: Scene }).__wigodStudioScene = scene
    window.dispatchEvent(new CustomEvent("wigod-studio-scene", { detail: scene }))
  }

  async function endWigodLive() {
    const room = liveRoomRef.current
    liveRoomRef.current = null
    if (room) {
      try {
        await room.disconnect()
      } catch {
        // The connection may already be closed.
      }
    }

    if (liveRoomNameRef.current) {
      await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", room: liveRoomNameRef.current }),
        keepalive: true,
      }).catch(() => {})
    }

    liveRoomNameRef.current = ""
    setLiveRoomName("")
    setStatus(camera || screen || audioStreamRef.current ? "previewing" : "ready")
  }

  async function startWigodLive() {
    setError("")

    if (!liveSdkReady || !window.LivekitClient) {
      setError("The WIGOD live video engine is still loading. Please wait a moment and try again.")
      return
    }

    const source = screen ? screenStreamRef.current : cameraStreamRef.current
    if (!source?.getVideoTracks().length) {
      setError("Turn on the camera or share your screen before starting WIGOD Live.")
      return
    }

    try {
      const sessionResponse = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "WIGOD Live",
          description: lowerName || "Live on WIGOD",
          thumbnailUrl: thumbnailUrl || null,
          category: "community",
          action: "start",
        }),
      })
      const sessionPayload = await sessionResponse.json()
      if (!sessionResponse.ok) throw new Error(sessionPayload.error || "WIGOD could not create the live session.")

      const roomName = String(sessionPayload.live?.room_name || "")
      if (!roomName) throw new Error("WIGOD did not receive a live room.")

      const tokenResponse = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, role: "publisher" }),
      })
      const tokenPayload = await tokenResponse.json()
      if (!tokenResponse.ok) throw new Error(tokenPayload.error || "WIGOD could not authorise the broadcast.")

      const livekit = window.LivekitClient
      const room = new livekit.Room({ adaptiveStream: true, dynacast: true })
      liveRoomRef.current = room

      await room.connect(tokenPayload.serverUrl, tokenPayload.token)

      const videoTrack = source.getVideoTracks()[0]
      await room.localParticipant.publishTrack(videoTrack, {
        name: "wigod-video",
        source: screen ? livekit.Track.Source.ScreenShare : livekit.Track.Source.Camera,
        simulcast: true,
      })

      const audioTrack = source.getAudioTracks()[0] || audioStreamRef.current?.getAudioTracks()[0]
      if (audioTrack && audioTrack.enabled) {
        await room.localParticipant.publishTrack(audioTrack, {
          name: "wigod-audio",
          source: livekit.Track.Source.Microphone,
          stream: "wigod",
        })
      }

      liveRoomNameRef.current = roomName
      setLiveRoomName(roomName)
      setStatus("live")    } catch (cause) {
      await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
        keepalive: true,
      }).catch(() => {})
      liveRoomRef.current = null
      setStatus(camera || screen || audioStreamRef.current ? "previewing" : "ready")
      setError(cause instanceof Error ? cause.message : "WIGOD could not start the live broadcast.")
    }
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
        primaryColor,
        accentColor,
        bannerColor,
        bannerTextColor,
        bannerLayout,
        bannerRadius,
        tickerColor,
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

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00"
    const total = Math.floor(seconds)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const secs = total % 60
    return hours > 0
      ? [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":")
      : [minutes, secs].map((value) => String(value).padStart(2, "0")).join(":")
  }

  return (
    <div className="space-y-5">
      <Script
        src="https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.min.js"
        strategy="afterInteractive"
        onLoad={() => setLiveSdkReady(true)}
        onError={() => setError("The WIGOD live video engine could not be loaded.")}
      />
      <style jsx>{`
        @keyframes wigodTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
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
            style={backgroundKind === "picture" && backgroundUrl ? { backgroundImage: "url(" + backgroundUrl + ")", backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {backgroundKind === "video" && backgroundUrl ? (
              <video src={backgroundUrl} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" aria-hidden="true" />
            ) : null}
            {mediaPlaying && mediaUrl ? (
              layout === "media" || layout === "screen" || layout === "cinema" ? (
                <video ref={mediaVideoRef} src={mediaUrl} autoPlay controls playsInline className="absolute inset-0 size-full object-contain bg-black" style={{ objectPosition: customMediaPosition, transform: "scale(" + customMediaZoom / 100 + ")" }} onEnded={() => setMediaPlaying(false)} />
              ) : layout === "split" || layout === "news" ? (
                <div className="absolute inset-0 grid grid-cols-2 gap-1 bg-black p-1">
                  <div className="relative overflow-hidden rounded-lg bg-black">
                    {camera ? <video ref={videoRef} muted playsInline autoPlay className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs text-white/50">Camera off</div>}
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-black">
                    <video ref={mediaVideoRef} src={mediaUrl} autoPlay controls playsInline className="size-full object-contain" />
                  </div>
                </div>
              ) : layout === "pip" ? (
                <div className="absolute inset-0 overflow-hidden bg-black">
                  <video ref={mediaVideoRef} src={mediaUrl} autoPlay controls playsInline className="size-full object-contain" />
                  {camera ? <div className="absolute bottom-3 right-3 h-32 w-48 overflow-hidden rounded-xl border-2 border-white/80 bg-black shadow-xl"><video ref={videoRef} muted playsInline autoPlay className="size-full object-cover" /></div> : null}
                </div>
              ) : layout === "custom" ? (
                <div className="absolute inset-0 overflow-hidden bg-black">
                  <div className={"absolute inset-y-0 overflow-hidden " + (customCameraSide === "left" ? "left-0" : "right-0")} style={{ width: customCameraWidth + "%" }}>
                    {camera ? <video ref={videoRef} muted playsInline autoPlay className="size-full object-cover" style={{ objectPosition: customCameraPosition, transform: "scale(" + customCameraZoom / 100 + ")" }} /> : <div className="flex size-full items-center justify-center text-xs text-white/50">Camera off</div>}
                  </div>
                  <div className={"absolute inset-y-0 overflow-hidden " + (customCameraSide === "left" ? "right-0" : "left-0")} style={{ width: (100 - customCameraWidth) + "%" }}>
                    <video ref={mediaVideoRef} src={mediaUrl} autoPlay controls playsInline className="size-full object-contain" style={{ objectPosition: customMediaPosition, transform: "scale(" + customMediaZoom / 100 + ")" }} />
                  </div>
                </div>
              ) : (
                <video ref={videoRef} muted playsInline autoPlay className={"size-full object-cover " + (layout === "cropped" ? "scale-110" : "")} />
              )
            ) : layout === "media" || layout === "screen" || layout === "cinema" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white/50 text-xs">Add and play a video to use Media only.</div>
            ) : (
              <video ref={videoRef} muted playsInline autoPlay className={"size-full object-cover " + (layout === "cropped" ? "scale-110" : "")} />
            )}

            {!camera && !screen && !mediaPlaying ? (
              avatarUrl ? (
                <div className={"absolute inset-0 flex items-center justify-center " + (backgroundKind ? "bg-black/10" : "bg-black")}>
                  <img src={avatarUrl} alt="Creator avatar" className="size-28 rounded-full border-4 border-white/20 object-cover shadow-2xl" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <Video className="size-10 opacity-70" />
                  <p className="mt-2 text-sm font-semibold">WIGOD Live preview</p>
                  <p className="mt-1 max-w-xs text-xs text-white/60">Turn on your camera, share your screen or play media.</p>
                </div>
              )
            ) : null}

            {logoUrl && !headlineOn ? (
              <img
                src={logoUrl}
                alt="WIGOD logo"
                className="absolute right-3 top-3 z-20 h-12 w-12 rounded object-contain"
              />
            ) : null}

            <WigodGraphicsPreview />
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
              {mic ? "Mic on" : mediaMicMuted ? "Mic muted for video" : "Mic muted"}
            </button>

            <button
              type="button"
              onClick={toggleScreenSharing}
              className={"inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold " + (screen ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-border")}
            >
              <MonitorUp className="size-4" />
              {screen ? "Stop sharing" : "Share screen"}
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
            <div className="mt-4 flex items-center gap-2">
              {status === "live" ? (
                <button type="button" onClick={() => void endWigodLive()} className="flex-1 rounded-xl bg-brand-red px-4 py-3 text-sm font-bold text-white">
                  End WIGOD Live
                </button>
              ) : (
                <button type="button" onClick={() => void startWigodLive()} disabled={!camera && !screen || !liveSdkReady} className="flex-1 rounded-xl bg-brand-red px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
                  {liveSdkReady ? "Start WIGOD Live" : "Loading live engine…"}
                </button>
              )}
              <div className="min-w-[118px] rounded-xl border border-border bg-background px-3 py-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Video time</p>
                <p className="text-sm font-black tabular-nums">{formatTime(mediaElapsed)} / {formatTime(mediaDuration)}</p>
              </div>
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">Video time is a studio control only and is not broadcast.</p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {status === "live" && liveRoomName ? "Broadcasting to WIGOD room " + liveRoomName : "WIGOD Live uses a real-time media server so remote viewers can watch from the public Live room."}
            </p>
            {status === "live" && liveRoomName ? (
              <div className="mt-2 rounded-lg bg-brand-green/10 px-3 py-2 text-[10px] font-semibold text-brand-green">
                Share: {typeof window !== "undefined" ? window.location.origin + "/live/" + liveRoomName : "/live/" + liveRoomName}
              </div>
            ) : null}
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

              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-xs font-bold">Creator avatar</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">Shown automatically when your camera is off.</p>
                <div className="mt-2 flex items-center gap-3">
                  {avatarUrl ? <img src={avatarUrl} alt="Creator avatar" className="size-14 rounded-full object-cover" /> : <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-[10px] text-muted-foreground">Avatar</div>}
                  <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-[10px] font-semibold hover:bg-secondary">
                    Choose avatar
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, setAvatarUrl, true)} />
                  </label>
                </div>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Studio backgrounds</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">Choose a picture or looping video background. Your choice stays until you remove or replace it.</p>
                  </div>
                  {backgroundUrl ? <button type="button" onClick={() => { setBackgroundUrl(""); setBackgroundKind("") }} className="rounded-lg border border-brand-red/30 px-2 py-1 text-[9px] font-bold text-brand-red">Remove</button> : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {STUDIO_BACKGROUND_OPTIONS.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setBackgroundUrl(item.url); setBackgroundKind(item.kind) }} className={"rounded-xl border p-2 text-left " + (backgroundUrl === item.url ? "border-brand-green bg-brand-green/5" : "border-border hover:bg-secondary")}>
                      <div className="aspect-video overflow-hidden rounded-lg bg-black">
                        {item.kind === "video" ? <video src={item.url} muted autoPlay loop playsInline className="size-full object-cover" /> : <img src={item.url} alt="" className="size-full object-cover" />}
                      </div>
                      <p className="mt-1 text-[9px] font-bold">{item.name}</p>
                      <p className="text-[8px] text-muted-foreground">{item.kind === "video" ? "Video" : "Picture"}</p>
                    </button>
                  ))}
                </div>
                <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-border p-3 text-center text-[10px] font-semibold hover:bg-secondary">
                  Upload picture background
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, (url) => { setBackgroundUrl(url); setBackgroundKind("picture") }, true)} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-xl border border-border p-3 text-center text-[11px] font-semibold hover:bg-secondary">
                  <ImageIcon className="mx-auto size-4 text-brand-green" />
                  <span className="mt-1 block">Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAsset(event, setLogoUrl, true)} />
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Broadcast graphics</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">These are the live programme controls. The same internal graphics engine renders Studio and Programme Output.</p>
                  </div>
                  <div className="text-right"><p className="text-[9px] font-bold text-brand-green">Shared renderer</p><p className="text-[10px] font-black">WIGOD Graphics Engine</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>LIVE stamp</span><input type="checkbox" checked={liveStampOn} onChange={(event) => setLiveStampOn(event.target.checked)} /></label>
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>Broadcast time</span><input type="checkbox" checked={broadcastTimeOn} onChange={(event) => setBroadcastTimeOn(event.target.checked)} /></label>
                  <label className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>News headlines</span><input type="checkbox" checked={headlineOn} onChange={(event) => setHeadlineOn(event.target.checked)} /></label>
                  <label className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] font-semibold"><span>Scrolling ticker</span><input type="checkbox" checked={tickerOn} onChange={(event) => setTickerOn(event.target.checked)} /></label>
                </div>
                <textarea value={headlines} onChange={(event) => { setHeadlines(event.target.value); setHeadlineIndex(0) }} rows={4} placeholder="One headline per line" className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <p className="mt-1 text-[9px] text-muted-foreground">Headlines rotate automatically every 6 seconds. Use one headline per line.</p>
                <input value={ticker} onChange={(event) => setTicker(event.target.value)} placeholder="Add scrolling ticker text..." className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">
                    Ticker background
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={tickerColor} onChange={(event) => setTickerColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{tickerColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">
                    Ticker size
                    <select value={tickerHeight} onChange={(event) => setTickerHeight(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-[10px]">
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                </div>
                <label className="mt-3 block rounded-lg border border-border p-2 text-[10px] font-semibold">
                  Scroll speed
                  <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Slower</span><span>{tickerSpeed}s</span><span>Faster</span>
                  </div>
                  <input type="range" min="18" max="60" step="1" value={tickerSpeed} onChange={(event) => setTickerSpeed(Number(event.target.value))} className="mt-1 w-full" />
                  <p className="mt-1 text-[9px] font-normal text-muted-foreground">Higher seconds = slower movement.</p>
                </label>
                <p className="mt-2 text-[9px] text-muted-foreground">The ticker runs full width beneath the headline/time graphic and leaves a clean margin below.</p>
              </div>

              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="size-4 text-brand-green" />
                    <p className="text-xs font-bold">Screen text</p>
                  </div>
                  <label className="flex items-center gap-2 text-[10px] font-semibold">
                    <span>{screenTextOn ? "On" : "Off"}</span>
                    <input type="checkbox" checked={screenTextOn} onChange={(event) => setScreenTextOn(event.target.checked)} />
                  </label>
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
                  </select>                </div>
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
              {layout === "custom" ? (
                <div className="space-y-3 rounded-xl bg-secondary/40 p-3">
                  <p className="text-xs font-bold">Custom stage editor</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-semibold">Camera side<select value={customCameraSide} onChange={(event) => setCustomCameraSide(event.target.value as "left" | "right")} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="left">Left</option><option value="right">Right</option></select></label>
                    <label className="text-[10px] font-semibold">Camera width <span className="float-right">{customCameraWidth}%</span><input type="range" min="20" max="80" value={customCameraWidth} onChange={(event) => setCustomCameraWidth(Number(event.target.value))} className="mt-2 w-full" /></label>
                    <label className="text-[10px] font-semibold">Camera crop <span className="float-right">{customCameraZoom}%</span><input type="range" min="80" max="160" value={customCameraZoom} onChange={(event) => setCustomCameraZoom(Number(event.target.value))} className="mt-2 w-full" /></label>
                    <label className="text-[10px] font-semibold">Media crop <span className="float-right">{customMediaZoom}%</span><input type="range" min="80" max="160" value={customMediaZoom} onChange={(event) => setCustomMediaZoom(Number(event.target.value))} className="mt-2 w-full" /></label>
                    <label className="text-[10px] font-semibold">Camera position<select value={customCameraPosition} onChange={(event) => setCustomCameraPosition(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label>
                    <label className="text-[10px] font-semibold">Media position<select value={customMediaPosition} onChange={(event) => setCustomMediaPosition(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label>
                  </div>
                  <p className="text-[9px] leading-4 text-muted-foreground">Build a camera + media composition by changing the split, side, zoom and crop position. Changes appear immediately on the preview.</p>
                </div>
              ) : null}

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
                  <button key={scene.id} type="button" onClick={() => applyScene(scene)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold">{scene.name}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{LAYOUTS.find((item) => item.id === scene.layout)?.name ?? scene.layout} · {scene.bannerLayout.replace("-", " ")}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="size-4 rounded-full border border-border" style={{ backgroundColor: scene.primaryColor }} />
                        <span className="size-4 rounded-full border border-border" style={{ backgroundColor: scene.accentColor }} />
                        <span className="size-4 rounded-full border border-border" style={{ backgroundColor: scene.bannerColor }} />
                        <ChevronDown className="ml-1 size-3.5 -rotate-90 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="mt-2 overflow-hidden" style={{ borderRadius: scene.bannerRadius === "pill" ? 999 : scene.bannerRadius === "rounded" ? 8 : 0 }}>
                      <div className="h-2" style={{ backgroundColor: scene.primaryColor }} />
                      <div className="flex h-5 items-center px-2 text-[8px] font-bold" style={{ backgroundColor: scene.bannerColor, color: scene.bannerTextColor }}>
                        {scene.name} · {scene.bannerLayout.replace("-", " ")}
                      </div>
                    </div>
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
                <p className="mt-1 text-[10px] text-muted-foreground">Playing video automatically mutes your mic; you can unmute it during playback.</p>
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
                  <button type="button" onClick={() => { setMediaPlaying(true); setMediaMicMuted(mic) }} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-bold text-white">
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