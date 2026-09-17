"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, MessageCircle, MonitorUp, Mic, Radio, Send, Settings2, Sparkles, Video } from "lucide-react"

type Scene = "camera" | "screen" | "split"

export function LiveStudio({ officialTv = false }: { officialTv?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [screenOn, setScreenOn] = useState(false)
  const [scene, setScene] = useState<Scene>("camera")
  const [visibility, setVisibility] = useState("public")
  const [comments, setComments] = useState(true)
  const [overlay, setOverlay] = useState(true)
  const [overlayText, setOverlayText] = useState("AFRICA & BEYOND")
  const [thumbnail, setThumbnail] = useState("")
  const [title, setTitle] = useState(officialTv ? "Africa & Beyond TV — Live" : "My live broadcast")
  const [started, setStarted] = useState(false)

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraOn(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraOn(true)
    } catch { setCameraOn(false) }
  }

  async function toggleScreen() {
    if (screenOn) { streamRef.current?.getTracks().forEach((track) => track.stop()); setScreenOn(false); return }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = stream
      setScreenOn(true)
    } catch { setScreenOn(false) }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-brand-red">{officialTv ? "Africa & Beyond TV" : "Creator Studio"}</p><h2 className="mt-1 font-serif text-xl font-bold">{started ? "Live room is active" : "Prepare your live broadcast"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Build the room first, then start the live session. The browser preview is real; server-side publishing is connected separately.</p></div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${started ? "border-brand-red/30 bg-brand-red/10 text-brand-red" : "border-border bg-background"}`}><Radio className="size-3.5" /> {started ? "Live" : "Studio ready"}</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <section className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-sm"><video ref={videoRef} muted playsInline className="h-full w-full object-cover" />{!cameraOn && !screenOn && <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white"><Video className="size-9 opacity-70" /><p className="mt-2 text-sm font-semibold">Studio preview</p><p className="mt-1 max-w-xs text-xs text-white/60">Turn on your camera or share your screen to preview the room.</p></div>}{overlay && <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1.5 text-[10px] font-black tracking-widest text-white">{overlayText || "AFRICA & BEYOND"}</div>}</div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={toggleCamera} className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-xs font-bold text-white"><Camera className="size-4" />{cameraOn ? "Camera off" : "Camera"}</button><button type="button" onClick={() => setMicOn((v) => !v)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${micOn ? "border-border bg-background" : "border-brand-red/30 bg-brand-red/10 text-brand-red"}`}><Mic className="size-4" />{micOn ? "Microphone on" : "Microphone off"}</button><button type="button" onClick={toggleScreen} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold"><MonitorUp className="size-4" />{screenOn ? "Stop sharing" : "Share screen"}</button></div>

          <div className="rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Scenes</h3><p className="mt-1 text-xs text-muted-foreground">Switch the presentation layout during the show.</p></div><Sparkles className="size-4 text-muted-foreground" /></div><div className="mt-3 grid grid-cols-3 gap-2">{(["camera", "screen", "split"] as Scene[]).map((item) => <button key={item} type="button" onClick={() => setScene(item)} className={`rounded-xl border px-3 py-3 text-xs font-bold capitalize ${scene === item ? "border-brand-green bg-brand-green/10" : "border-border"}`}>{item === "camera" ? "Camera" : item === "screen" ? "Screen" : "Split"}</button>)}</div></div>

          {officialTv && <div className="rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4"><div className="flex items-center gap-2"><Radio className="size-4 text-brand-red" /><h3 className="text-sm font-bold">Africa & Beyond TV YouTube</h3></div><p className="mt-1 text-xs leading-5 text-muted-foreground">YouTube is available here only for the official Africa & Beyond TV account. Other creators broadcast on Africa & Beyond Social.</p></div>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><Settings2 className="size-4" /><h3 className="text-sm font-bold">Broadcast settings</h3></div><label className="mt-4 block text-xs font-semibold">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none" /></label><label className="mt-3 block text-xs font-semibold">Visibility<select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label><p className="mt-2 text-[10px] leading-4 text-muted-foreground">Public, unlisted and private rooms are supported as audience controls.</p></div>
          <div className="rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ImagePlus className="size-4" /><h3 className="text-sm font-bold">Thumbnail</h3></div><span className="text-[10px] text-muted-foreground">16:9</span></div><input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="Thumbnail image URL" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none" />{thumbnail ? <img src={thumbnail} alt="Broadcast thumbnail preview" className="mt-3 aspect-video w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-secondary text-center text-[10px] text-muted-foreground">Choose a broadcast thumbnail</div>}</div>
          <div className="rounded-2xl border border-border p-4"><h3 className="text-sm font-bold">Audience interaction</h3><label className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-3 text-xs"><span className="flex items-center gap-2"><MessageCircle className="size-4" /> Show comments</span><input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /></label><label className="mt-2 flex items-center justify-between rounded-xl border border-border px-3 py-3 text-xs"><span className="flex items-center gap-2"><Sparkles className="size-4" /> Show overlay</span><input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /></label>{overlay && <input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Overlay text" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none" />}</div>
          <button type="button" onClick={() => setStarted((v) => !v)} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white ${started ? "bg-brand-red" : "bg-brand-green"}`}><Send className="size-4" />{started ? "End live session" : "Start live session"}</button>
          <p className="text-center text-[10px] leading-4 text-muted-foreground">{officialTv ? "Official TV mode: YouTube connection is reserved for Africa & Beyond TV." : "Creator mode: your live room is hosted on Africa & Beyond Social."}</p>
        </aside>
      </div>
    </div>
  )
}
