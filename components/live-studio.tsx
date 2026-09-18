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
  | "camera"
  | "media"
  | "split"
  | "custom"

type Panel = "settings" | "brand" | "layout" | "scenes" | "media"
type BannerLayout = "lower-third" | "full-width" | "split" | "pill" | "corner" | "headline"
type OverlayDesign = "newsroom" | "split-bar" | "modern" | "minimal" | "corner" | "stacked"

const OVERLAY_DESIGNS: Array<{ id: OverlayDesign; name: string; description: string }> = [
  { id: "newsroom", name: "Newsroom", description: "Headline bar, clock, logo and ticker" },
  { id: "split-bar", name: "Split Bar", description: "Headline space with dedicated time block" },
  { id: "modern", name: "Modern", description: "Clean floating headline with accent edge" },
  { id: "minimal", name: "Minimal", description: "Light graphics with maximum video space" },
  { id: "corner", name: "Corner", description: "Compact headline and clock corners" },
  { id: "stacked", name: "Stacked News", description: "Headline and ticker form a two-tier news bar" },
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
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayDesign, setOverlayDesign] = useState<OverlayDesign>("newsroom")
  const [liveStampOn, setLiveStampOn] = useState(false)
  const [broadcastTimeOn, setBroadcastTimeOn] = useState(false)
  const [liveClock, setLiveClock] = useState("")
  const [mediaElapsed, setMediaElapsed] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [overlayUrl, setOverlayUrl] = useState("")
  const [overlayOpacity, setOverlayOpacity] = useState(100)
  const [logoUrl, setLogoUrl] = useState("")
  const [backgroundUrl, setBackgroundUrl] = useState("")
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
  const [ticker, setTicker] = useState("")
  const [tickerOn, setTickerOn] = useState(false)
  const [headlineOn, setHeadlineOn] = useState(false)
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
          if (typeof saved.overlayDesign === "string") setOverlayDesign(saved.overlayDesign as OverlayDesign)
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
        if (typeof saved.thumbnailUrl === "string") setThumbnailUrl(saved.thumbnailUrl)
        if (typeof saved.avatarUrl === "string") setAvatarUrl(saved.avatarUrl)
      }
    } catch {
      // Ignore invalid or unavailable browser preferences.
    }
    preferencesLoadedRef.current = true
  }, [])

  useEffect(() => {
    if (!preferencesLoadedRef.current) return
    try {
      window.localStorage.setItem("wigod-live-studio-preferences", JSON.stringify({
        layout, panel, showOverlay, liveStampOn, broadcastTimeOn, overlayOpacity,
        overlayDesign, screenText, screenTextOn, screenTextPosition, screenTextSize, lowerThird, lowerName, lowerRole,
        primaryColor, accentColor, bannerColor, bannerTextColor, bannerLayout, bannerRadius,
        tickerColor, ticker, tickerOn, headlineOn, headlines, scenes, graphicsDefaultsVersion: 2,
        customCameraSide, customCameraWidth, customCameraZoom, customMediaZoom,
        customCameraPosition, customMediaPosition, logoUrl, overlayUrl, backgroundUrl, thumbnailUrl, avatarUrl
      }))
    } catch {
      // Storage can be unavailable or full; never break the studio.
    }
  }, [
    layout, panel, showOverlay, liveStampOn, broadcastTimeOn, overlayOpacity,
    overlayDesign, screenText, screenTextOn, screenTextPosition, screenTextSize, lowerThird, lowerName, lowerRole,
    primaryColor, accentColor, bannerColor, bannerTextColor, bannerLayout, bannerRadius,
    tickerColor, ticker, tickerOn, headlineOn, headlines, scenes,
    customCameraSide, customCameraWidth, customCameraZoom, customMediaZoom,
    customCameraPosition, customMediaPosition, logoUrl, overlayUrl, backgroundUrl, thumbnailUrl, avatarUrl
  ])

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
    setPrimaryColor(scene.primaryColor)
    setAccentColor(scene.accentColor)
    setBannerColor(scene.bannerColor)
    setBannerTextColor(scene.bannerTextColor)
    setBannerLayout(scene.bannerLayout)
    setBannerRadius(scene.bannerRadius)
    setTickerColor(scene.tickerColor)
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
            style={backgroundUrl ? { backgroundImage: "url(" + backgroundUrl + ")", backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-center text-white">
                  <img src={avatarUrl} alt="Creator avatar" className="size-28 rounded-full border-4 border-white/20 object-cover shadow-2xl" />
                  <p className="mt-3 text-sm font-black">Camera off</p>
                  <p className="mt-1 text-[10px] text-white/60">Your creator avatar is on stage</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <Video className="size-10 opacity-70" />
                  <p className="mt-2 text-sm font-semibold">WIGOD Live preview</p>
                  <p className="mt-1 max-w-xs text-xs text-white/60">Turn on your camera, share your screen or play media.</p>
                </div>
              )
            ) : null}

            {logoUrl ? (
              <img
                src={logoUrl}
                alt="WIGOD logo"
                className={
                  "absolute z-20 rounded object-contain " +
                  (overlayDesign === "corner" ? "bottom-12 right-3 h-10 w-10" :
                    overlayDesign === "modern" ? "right-4 top-4 h-14 w-14" :
                    overlayDesign === "minimal" ? "right-4 top-4 h-10 w-10 opacity-90" :
                    "right-3 top-3 h-12 w-12")
                }
              />
            ) : null}

            {liveStampOn ? (
              <div className="pointer-events-none absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                LIVE
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

            {screenTextOn && screenText ? (
              <div className={"pointer-events-none absolute left-3 right-3 z-30 " + positionClass}>
                <div className={"mx-auto w-fit max-w-full rounded-lg bg-black/75 px-4 py-2 text-center font-black tracking-wide text-white " + textSizeClass}>
                  {screenText}
                </div>
              </div>
            ) : null}

            {lowerThird ? (
              bannerLayout === "full-width" ? (
                <div className="pointer-events-none absolute bottom-12 left-0 right-0 z-30 px-3">
                  <div className="w-full px-5 py-3" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderTop: "4px solid " + primaryColor }}>
                    <p className="text-sm font-black">{lowerName || "WIGOD LIVE"}</p>
                    <p className="mt-0.5 text-[10px] opacity-70">{lowerRole}</p>
                  </div>
                </div>
              ) : bannerLayout === "split" ? (
                <div className="pointer-events-none absolute bottom-12 left-3 z-30 flex max-w-[82%] overflow-hidden" style={{ borderRadius: bannerRadius === "pill" ? 999 : bannerRadius === "rounded" ? 12 : 0 }}>
                  <div className="px-4 py-2 text-sm font-black" style={{ backgroundColor: primaryColor, color: bannerTextColor }}>{lowerName || "WIGOD LIVE"}</div>
                  <div className="px-4 py-2 text-[10px] font-semibold" style={{ backgroundColor: bannerColor, color: bannerTextColor }}>{lowerRole}</div>
                </div>
              ) : bannerLayout === "pill" ? (
                <div className="pointer-events-none absolute bottom-12 left-3 z-30 max-w-[75%] px-5 py-2.5 shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor, border: "2px solid " + accentColor, borderRadius: 999 }}>
                  <p className="text-sm font-black">{lowerName || "WIGOD LIVE"}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{lowerRole}</p>
                </div>
              ) : bannerLayout === "corner" ? (
                <div className="pointer-events-none absolute bottom-12 right-3 z-30 max-w-[45%] px-4 py-2" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderRight: "4px solid " + accentColor, borderRadius: bannerRadius === "rounded" ? 12 : bannerRadius === "pill" ? 999 : 0 }}>
                  <p className="text-sm font-black">{lowerName || "WIGOD LIVE"}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{lowerRole}</p>
                </div>
              ) : bannerLayout === "headline" ? (
                <div className="pointer-events-none absolute bottom-12 left-3 right-3 z-30 px-4 py-2" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderLeft: "5px solid " + primaryColor }}>
                  <p className="text-sm font-black uppercase">{lowerName || "WIGOD LIVE"}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{lowerRole}</p>
                </div>
              ) : (
                <div className="pointer-events-none absolute bottom-12 left-3 z-30 max-w-[75%] px-4 py-2" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderLeft: "5px solid " + primaryColor, borderRadius: bannerRadius === "rounded" ? 12 : bannerRadius === "pill" ? 999 : 0 }}>
                  <p className="text-sm font-black">{lowerName || "WIGOD LIVE"}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{lowerRole}</p>
                </div>
              )
            ) : null}

            {headlineOn && headlines.trim() ? (
              <div className="pointer-events-none absolute left-0 right-0 z-40" style={{ bottom: tickerOn && ticker ? 32 : 8 }}>
                {overlayDesign === "newsroom" ? (
                  <div className="mx-0 flex min-h-8 overflow-hidden" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderTop: "3px solid " + primaryColor }}>
                    <div className="shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>HEADLINES</div>
                    <div className="min-w-0 flex-1 px-3 py-1.5 text-[10px] font-bold">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</div>
                    {broadcastTimeOn && liveClock ? <div className="shrink-0 border-l border-white/20 px-3 py-1.5 text-[10px] font-black tabular-nums">{liveClock}</div> : null}
                  </div>
                ) : overlayDesign === "split-bar" ? (
                  <div className="mx-3 flex min-h-9 overflow-hidden rounded-md shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor }}>
                    <div className="flex shrink-0 items-center px-3 text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>HEADLINES</div>
                    <div className="min-w-0 flex-1 px-3 py-2 text-[10px] font-bold">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</div>
                    {broadcastTimeOn && liveClock ? <div className="flex shrink-0 items-center border-l-4 px-3 text-[10px] font-black tabular-nums" style={{ borderColor: accentColor }}>{liveClock}</div> : null}
                  </div>
                ) : overlayDesign === "modern" ? (
                  <div className="mx-4 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-md shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderLeft: "6px solid " + primaryColor }}>
                      <div className="shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-wider">{broadcastTimeOn && liveClock ? liveClock : "HEADLINES"}</div>
                      <div className="min-w-0 flex-1 px-3 py-2 text-[10px] font-bold">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</div>
                    </div>
                  </div>
                ) : overlayDesign === "minimal" ? (
                  <div className="mx-5 border-l-4 px-3 py-1.5" style={{ borderColor: primaryColor, color: bannerTextColor, backgroundColor: "rgba(0,0,0,.72)" }}>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>NEWS</span>
                      <span className="min-w-0 flex-1 text-[10px] font-bold">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</span>
                      {broadcastTimeOn && liveClock ? <span className="shrink-0 text-[9px] font-black tabular-nums">{liveClock}</span> : null}
                    </div>
                  </div>
                ) : overlayDesign === "corner" ? (
                  <div className="flex items-end justify-between px-3">
                    <div className="max-w-[72%] overflow-hidden rounded-md shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderBottom: "3px solid " + primaryColor }}>
                      <div className="px-3 py-2 text-[10px] font-black">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</div>
                    </div>
                    {broadcastTimeOn && liveClock ? <div className="rounded-md px-3 py-2 text-[10px] font-black tabular-nums shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor }}>{liveClock}</div> : null}
                  </div>
                ) : (
                  <div className="mx-0 overflow-hidden shadow-lg" style={{ backgroundColor: bannerColor, color: bannerTextColor }}>
                    <div className="flex min-h-7 items-center">
                      <div className="shrink-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>HEADLINES</div>
                      <div className="min-w-0 flex-1 px-3 py-1 text-[10px] font-bold">{(headlines.split("\n").map((item) => item.trim()).filter(Boolean)[headlineIndex] || "WIGOD NEWS")}</div>
                      {broadcastTimeOn && liveClock ? <div className="shrink-0 px-3 py-1 text-[9px] font-black tabular-nums" style={{ backgroundColor: accentColor }}>{liveClock}</div> : null}
                    </div>
                  </div>
                )}
              </div>
            ) : broadcastTimeOn && liveClock ? (
              <div className="pointer-events-none absolute right-3 z-40 rounded-md px-3 py-1.5 text-[10px] font-black tabular-nums" style={{ bottom: tickerOn && ticker ? 32 : 8, backgroundColor: bannerColor, color: bannerTextColor }}>
                {liveClock}
              </div>
            ) : null}

            {tickerOn && ticker ? (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-50 overflow-hidden px-3 py-2 text-[11px] font-bold" style={{ backgroundColor: tickerColor, color: bannerTextColor }}>
                <div className="flex w-max min-w-full animate-[wigodTicker_18s_linear_infinite] whitespace-nowrap">
                  <span className="pr-16">{ticker}</span>
                  <span className="pr-16">{ticker}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Video time</span>
                <span className="text-xs font-bold tabular-nums">{formatTime(mediaElapsed)} / {formatTime(mediaDuration)}</span>
              </div>
              {mediaUrl ? (
                <input type="range" min={0} max={mediaDuration || 0} step="0.1" value={Math.min(mediaElapsed, mediaDuration || 0)} onChange={(event) => {
                  const next = Number(event.target.value)
                  setMediaElapsed(next)
                  if (mediaVideoRef.current) mediaVideoRef.current.currentTime = next
                }} className="mt-2 w-full" aria-label="Video position" />
              ) : (
                <p className="mt-1 text-[9px] text-muted-foreground">Studio-only timer — it is not part of the broadcast graphics.</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Broadcast time</span>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{broadcastTimeOn ? "Current time while broadcasting" : "Hidden from the studio stage"}</p>
                </div>
                <button type="button" onClick={() => setBroadcastTimeOn((value) => !value)} className={"rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white " + (broadcastTimeOn ? "bg-brand-green" : "bg-brand-red")}>
                  {broadcastTimeOn ? "On" : "Off"}
                </button>
              </div>
              {broadcastTimeOn ? <p className="mt-2 text-lg font-black tabular-nums">{liveClock}</p> : null}
            </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Broadcast graphics</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">Everything here is off by default. Turn on only what you want on air.</p>
                  </div>
                  <Radio className="size-4 text-brand-red" />
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
                <p className="mt-1 text-[9px] text-muted-foreground">When enabled, the ticker appears directly below the headline graphic.</p>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Overlay design</p>
                    <p className="text-[10px] text-muted-foreground">Choose a broadcast structure that gives your channel its own visual identity.</p>
                  </div>
                  <input type="checkbox" checked={showOverlay} onChange={(event) => setShowOverlay(event.target.checked)} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {OVERLAY_DESIGNS.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setOverlayDesign(item.id); setShowOverlay(true) }} className={"rounded-xl border p-2 text-left " + (overlayDesign === item.id ? "border-brand-green bg-brand-green/5" : "border-border hover:bg-secondary")}>
                      <div className="mb-2 overflow-hidden rounded-md border border-border bg-black/80">
                        <div className="h-1" style={{ backgroundColor: primaryColor }} />
                        <div className="flex h-5 items-end gap-1 p-1">
                          <span className="h-2 w-1/4 rounded-sm" style={{ backgroundColor: primaryColor }} />
                          <span className="h-1.5 flex-1 rounded-sm bg-white/60" />
                          <span className="h-1.5 w-1/6 rounded-sm" style={{ backgroundColor: accentColor }} />
                        </div>
                        <div className="h-1" style={{ backgroundColor: tickerColor }} />
                      </div>
                      <p className="text-[10px] font-bold">{item.name}</p>
                      <p className="mt-0.5 text-[8px] leading-3 text-muted-foreground">{item.description}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-muted-foreground">The selected design controls the headline structure, clock treatment and broadcast spacing. Colors remain yours.</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Creator colors & banners</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">Choose the visual identity used by your scenes.</p>
                  </div>
                  <Sparkles className="size-4 text-brand-red" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Primary
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{primaryColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Accent
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{accentColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Banner
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{bannerColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Banner text
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={bannerTextColor} onChange={(event) => setBannerTextColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{bannerTextColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Ticker
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={tickerColor} onChange={(event) => setTickerColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <span className="font-mono text-[9px]">{tickerColor}</span>
                    </div>
                  </label>
                  <label className="rounded-lg border border-border p-2 text-[10px] font-semibold">Banner shape
                    <select value={bannerRadius} onChange={(event) => setBannerRadius(event.target.value as typeof bannerRadius)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-[10px]">
                      <option value="square">Square</option>
                      <option value="rounded">Rounded</option>
                      <option value="pill">Pill</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold">Banner layout</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      ["lower-third", "Lower third"],
                      ["full-width", "Full width"],
                      ["split", "Split name + role"],
                      ["pill", "Pill"],
                      ["corner", "Corner"],
                      ["headline", "Headline bar"],
                    ] as Array<[BannerLayout, string]>).map(([id, name]) => (
                      <button key={id} type="button" onClick={() => setBannerLayout(id)} className={"rounded-lg border p-2 text-left text-[10px] font-semibold " + (bannerLayout === id ? "border-brand-green bg-brand-green/5" : "border-border hover:bg-secondary")}>
                        <div className="mb-1 h-3 overflow-hidden rounded-sm" style={{ backgroundColor: bannerColor }}>
                          <div className="h-full w-1/3" style={{ backgroundColor: primaryColor }} />
                        </div>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold">Live banner preview</p>
                    <span className="text-[9px] text-muted-foreground">Updates instantly</span>
                  </div>
                  <div className="mt-2 overflow-hidden p-2" style={{ backgroundColor: bannerColor, color: bannerTextColor, borderRadius: bannerRadius === "pill" ? 999 : bannerRadius === "rounded" ? 12 : 0 }}>
                    <p className="text-[10px] font-black">{lowerName || "CREATOR NAME"}</p>
                    <p className="text-[8px] opacity-70">{lowerRole || "Creator / Show title"}</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-bold">Lower third</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Show lower third</span>
                    <input type="checkbox" checked={lowerThird} onChange={(event) => setLowerThird(event.target.checked)} />
                  </div>
                  <input value={lowerName} onChange={(event) => setLowerName(event.target.value)} placeholder="Name / show title" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                  <input value={lowerRole} onChange={(event) => setLowerRole(event.target.value)} placeholder="Role / subtitle" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
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
                  </select>
                </div>
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
