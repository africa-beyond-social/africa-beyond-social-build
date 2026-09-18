"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Layers3,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  RefreshCw,
  Settings2,
  Type,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

export function LiveStudio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const [camera, setCamera] = useState(false)
  const [mic, setMic] = useState(true)
  const [screen, setScreen] = useState(false)
  const [status, setStatus] = useState<"ready" | "previewing" | "live">("ready")
  const [error, setError] = useState("")
  const [micLevel, setMicLevel] = useState(0)
  const [thumbnail, setThumbnail] = useState("")
  const [showOverlay, setShowOverlay] = useState(true)
  const [screenText, setScreenText] = useState("")
  const [textPosition, setTextPosition] = useState<"top" | "bottom">("bottom")

  useEffect(() => {
    return () => {
      if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current)
      audioContextRef.current?.close()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (thumbnail) URL.revokeObjectURL(thumbnail)
    }
  }, [thumbnail])

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    setMicLevel(0)
  }

  function startMeter(stream: MediaStream) {
    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) return

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextClass) return

      audioContextRef.current?.close()
      const context = new AudioContextClass()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = context
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(data)
        const average =
          data.reduce((sum, value) => sum + value, 0) / data.length
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)))
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
      stopStream()
      setCamera(false)
      setScreen(false)
      setStatus("ready")
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.")
      }

      const current = streamRef.current
      if (current) current.getTracks().forEach((track) => track.stop())

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      })

      streamRef.current = stream
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) audioTrack.enabled = mic

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCamera(true)
      setScreen(false)
      setStatus("previewing")
      startMeter(stream)
    } catch (cause) {
      const message =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Camera permission was blocked. Allow camera access for WIGOD in your browser, then try again."
          : cause instanceof DOMException && cause.name === "NotFoundError"
            ? "No camera was found. Check that your camera is connected and not being used by another application."
            : "WIGOD could not start the camera. Check browser permissions and try again."
      setError(message)
      setCamera(false)
    }
  }

  function toggleMic() {
    const next = !mic
    setMic(next)
    const audioTrack = streamRef.current?.getAudioTracks()[0]
    if (audioTrack) audioTrack.enabled = next
    if (!next) setMicLevel(0)
  }

  async function shareScreen() {
    setError("")

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing is not supported by this browser.")
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      const cameraAudio = streamRef.current?.getAudioTracks()[0]
      if (cameraAudio) displayStream.addTrack(cameraAudio)

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream
        await videoRef.current.play()
      }

      setScreen(true)
      setStatus("previewing")
      if (camera) setCamera(false)

      const screenTrack = displayStream.getVideoTracks()[0]
      screenTrack.addEventListener("ended", () => {
        setScreen(false)
        if (camera && streamRef.current && videoRef.current) {
          videoRef.current.srcObject = streamRef.current
        } else if (!camera && videoRef.current) {
          videoRef.current.srcObject = null
          setStatus("ready")
        }
      })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      setError("Screen sharing could not be started. Please try again.")
    }
  }

  function chooseThumbnail(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image for the broadcast thumbnail.")
      return
    }
    if (thumbnail) URL.revokeObjectURL(thumbnail)
    setThumbnail(URL.createObjectURL(file))
    setError("")
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
              WIGOD Live Studio
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold">
              Your broadcast workspace
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Prepare your camera, microphone, screen, branding and audience
              settings before starting a WIGOD Live session.
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
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.5fr)]">
        <section className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="size-full object-cover"
            />

            {!camera && !screen ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <Video className="size-10 opacity-70" />
                <p className="mt-2 text-sm font-semibold">WIGOD Live preview</p>
                <p className="mt-1 text-xs text-white/60">
                  Turn on your camera or share your screen.
                </p>
              </div>
            ) : null}

            {showOverlay ? (
              <div
                className={
                  "absolute left-3 right-3 rounded-md bg-black/70 px-3 py-2 text-xs font-bold text-white " +
                  (textPosition === "top" ? "top-3" : "bottom-3")
                }
              >
                {screenText || "WIGOD • PEOPLE. PLACES. PERSPECTIVES."}
              </div>
            ) : null}

            {thumbnail ? (
              <div className="absolute right-3 top-3 size-16 overflow-hidden rounded-lg border border-white/30 bg-black/50">
                <img
                  src={thumbnail}
                  alt="Broadcast thumbnail preview"
                  className="size-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              className={
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white " +
                (camera ? "bg-brand-green" : "bg-brand-red")
              }
            >
              {camera ? (
                <VideoOff className="size-4" />
              ) : (
                <Camera className="size-4" />
              )}
              {camera ? "Camera on" : "Camera off"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white " +
                (mic ? "bg-brand-green" : "bg-brand-red")
              }
            >
              {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {mic ? "Mic on" : "Mic muted"}
              {mic ? (
                <span
                  className="h-1.5 w-12 overflow-hidden rounded-full bg-white/30"
                  aria-label={"Microphone level " + micLevel + " percent"}
                >
                  <span
                    className="block h-full rounded-full bg-white transition-all"
                    style={{ width: micLevel + "%" }}
                  />
                </span>
              ) : (
                <VolumeX className="size-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={shareScreen}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold"
            >
              <MonitorUp className="size-4" />
              {screen ? "Screen sharing" : "Share screen"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-bold"
              title={mic ? "Mute microphone" : "Unmute microphone"}
            >
              {mic ? (
                <Volume2 className="size-4" />
              ) : (
                <Mic className="size-4 text-brand-red" />
              )}
            </button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-brand-red" />
              <div>
                <h3 className="text-sm font-bold">WIGOD Live</h3>
                <p className="text-xs text-muted-foreground">
                  Native WIGOD destination
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Your broadcast is designed to live on WIGOD first. YouTube can
              remain an optional publishing connection; Facebook and TikTok
              are not required destinations.
            </p>
            <button
              type="button"
              onClick={() => setStatus("live")}
              disabled={!camera && !screen}
              className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Start WIGOD Live
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Production WebRTC/media-server transport is still required to
              carry a live session to remote viewers.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4" />
              <h3 className="text-sm font-bold">Broadcast settings</h3>
            </div>
            <label className="mt-4 block text-xs font-semibold">Title</label>
            <input
              defaultValue="WIGOD Live"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-semibold">
              Description
            </label>
            <textarea
              defaultValue="People. Places. Perspectives."
              className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <label className="mt-3 block text-xs font-semibold">Visibility</label>
            <select className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option>Public</option>
              <option>Unlisted</option>
              <option>Private</option>
            </select>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-[11px] font-semibold hover:bg-secondary"
              >
                <ImageIcon className="size-4 text-brand-green" />
                Thumbnail
              </button>
              <button
                type="button"
                onClick={() => setShowOverlay((value) => !value)}
                className={
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-semibold " +
                  (showOverlay
                    ? "border-brand-green bg-brand-green/5"
                    : "border-border")
                }
              >
                <Layers3 className="size-4 text-brand-red" />
                Overlays
              </button>
              <button
                type="button"
                onClick={() =>
                  setTextPosition((value) =>
                    value === "bottom" ? "top" : "bottom",
                  )
                }
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-[11px] font-semibold hover:bg-secondary"
              >
                <Type className="size-4 text-brand-green" />
                Screen text
              </button>
            </div>

            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={chooseThumbnail}
              className="hidden"
            />

            <div className="mt-4 rounded-xl bg-secondary/40 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">Screen text</p>
                <button
                  type="button"
                  onClick={() => setScreenText("")}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <input
                value={screenText}
                onChange={(event) => setScreenText(event.target.value)}
                placeholder="Add a title, name or ticker text..."
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Position: {textPosition}. The text is shown in the local
                broadcast preview.
              </p>
            </div>

            {thumbnail ? (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(thumbnail)
                  setThumbnail("")
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-red"
              >
                <X className="size-3" />
                Remove thumbnail
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold">Audience</h3>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-3 text-xs">
              <span>Live comments</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-border px-3 py-3 text-xs">
              <span>Allow reactions</span>
              <input type="checkbox" defaultChecked />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-brand-green" />
              <p className="text-xs font-bold">Production controls</p>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Camera, microphone level, screen sharing, thumbnail, overlays
              and screen text are available in the Studio preview.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
