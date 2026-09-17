"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, MessageCircle, Radio, Send, Settings2, Sparkles, Video, X } from "lucide-react"

type Destination = "youtube" | "facebook" | "tiktok"

export function LiveStudio() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [visibility, setVisibility] = useState("public")
  const [comments, setComments] = useState(true)
  const [overlay, setOverlay] = useState(true)
  const [overlayText, setOverlayText] = useState("AFRICA & BEYOND")
  const [thumbnail, setThumbnail] = useState("")
  const [destinations, setDestinations] = useState<Destination[]>(["youtube"])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setCameraOn(false)
    }
  }

  function toggleDestination(destination: Destination) {
    setDestinations((current) =>
      current.includes(destination)
        ? current.filter((item) => item !== destination)
        : [...current, destination],
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Africa & Beyond Studio</p>
            <h2 className="mt-1 font-serif text-xl font-bold">Create your live broadcast</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">A StreamYard-style control surface for camera, overlays, audience settings and publishing destinations.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold"><Radio className="size-3.5" /> Studio ready</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <section className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-sm">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            {!cameraOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <Video className="size-9 opacity-70" />
                <p className="mt-2 text-sm font-semibold">Studio preview</p>
                <p className="mt-1 max-w-xs text-xs text-white/60">Turn on your camera to preview the presenter feed.</p>
              </div>
            ) : null}
            {overlay ? (
              <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1.5 text-[10px] font-black tracking-widest text-white">{overlayText || "AFRICA & BEYOND"}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleCamera} className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-xs font-bold text-white"><Camera className="size-4" /> {cameraOn ? "Turn camera off" : "Turn camera on"}</button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold"><Settings2 className="size-4" /> Camera & audio</button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold"><Sparkles className="size-4" /> Scenes</button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold">Broadcast destinations</h3><p className="mt-1 text-xs text-muted-foreground">One studio feed can be sent to multiple RTMP destinations.</p></div>
              <Send className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["youtube", "facebook", "tiktok"] as Destination[]).map((destination) => {
                const active = destinations.includes(destination)
                return (
                  <button key={destination} type="button" onClick={() => toggleDestination(destination)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold ${active ? "border-brand-green bg-brand-green/10" : "border-border"}`}>
                    <span className="block capitalize">{destination}</span>
                    <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{active ? "Selected" : "Not selected"}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">YouTube will be the first native integration. Facebook and TikTok can be added as RTMP destinations when their live credentials are available.</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2"><Settings2 className="size-4" /><h3 className="text-sm font-bold">Broadcast settings</h3></div>
            <label className="mt-4 block text-xs font-semibold">Title</label>
            <input defaultValue="Africa & Beyond TV — Live" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            <label className="mt-3 block text-xs font-semibold">Visibility</label>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">These privacy states map directly to YouTube broadcast visibility when YouTube is connected.</p>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ImagePlus className="size-4" /><h3 className="text-sm font-bold">Thumbnail</h3></div><span className="text-[10px] text-muted-foreground">16:9</span></div>
            <input value={thumbnail} onChange={(event) => setThumbnail(event.target.value)} placeholder="Thumbnail image URL" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none" />
            {thumbnail ? <img src={thumbnail} alt="Broadcast thumbnail preview" className="mt-3 aspect-video w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-secondary text-center text-[10px] text-muted-foreground">Upload or choose a broadcast thumbnail</div>}
          </div>

          <div className="rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold">Audience interaction</h3>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-xs"><span className="flex items-center gap-2"><MessageCircle className="size-4" /> Show comments</span><input type="checkbox" checked={comments} onChange={(event) => setComments(event.target.checked)} /></label>
            <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-xs"><span className="flex items-center gap-2"><Sparkles className="size-4" /> Show overlay</span><input type="checkbox" checked={overlay} onChange={(event) => setOverlay(event.target.checked)} /></label>
            {overlay ? <input value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="Overlay text" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none" /> : null}
          </div>

          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><X className="mt-0.5 size-4 shrink-0" /><p><strong className="text-foreground">Publishing engine:</strong> the browser preview is ready, but the actual multi-platform feed needs a server-side WebRTC/RTMP media layer. We will connect that layer next rather than pretending the website alone can relay live video.</p></div>
          </div>
        </aside>
      </div>
    </div>
  )
}
