"use client"

import { useRef, useState } from "react"
import { Camera, Image as ImageIcon, MessageCircle, Mic, MonitorUp, Play, Plus, Radio, Settings2, Sparkles, Upload, Users, Video, X } from "lucide-react"

const destinations = [
  { id: "youtube", label: "YouTube", detail: "Primary broadcast destination" },
  { id: "facebook", label: "Facebook", detail: "Connect a Facebook Live destination" },
  { id: "tiktok", label: "TikTok", detail: "Connect a TikTok LIVE destination" },
  { id: "wigod", label: "WIGOD", detail: "Publish inside WIGOD Live" },
]

export function WigodLiveStudio() {
  const [visibility, setVisibility] = useState("public")
  const [comments, setComments] = useState(true)
  const [overlay, setOverlay] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [overlayText, setOverlayText] = useState("WIGOD LIVE")
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(["youtube", "wigod"])
  const [cameraReady, setCameraReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleDestination(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function handleThumbnail(file?: File) {
    if (!file) return
    setThumbnail(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-background shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Radio className="size-4 text-brand-red" /><span className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD Live Studio</span></div>
            <h2 className="mt-1 font-serif text-xl font-bold">Create your live broadcast</h2>
            <p className="mt-1 text-xs text-muted-foreground">Prepare one broadcast and send it to your connected destinations.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><span className="size-2 rounded-full bg-brand-green" /> Studio ready</div>
        </div>

        <div className="grid lg:grid-cols-[1.45fr_.8fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              {thumbnail ? <img src={thumbnail} alt="Broadcast thumbnail preview" className="absolute inset-0 size-full object-cover opacity-55" /> : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <div className="flex size-14 items-center justify-center rounded-full border border-white/20 bg-white/10"><Camera className="size-6" /></div>
                <p className="mt-3 text-sm font-semibold">Camera preview</p>
                <p className="mt-1 text-xs text-white/60">{cameraReady ? "Camera connected" : "Connect your camera and microphone"}</p>
                <button type="button" onClick={() => setCameraReady((value) => !value)} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-black">{cameraReady ? "Camera connected" : "Enable camera"}</button>
              </div>
              {overlay ? <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur">{overlayText || "WIGOD LIVE"}</div> : null}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Camera className="mx-auto mb-1 size-4" />Camera</button>
              <button type="button" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Mic className="mx-auto mb-1 size-4" />Microphone</button>
              <button type="button" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"><MonitorUp className="mx-auto mb-1 size-4" />Screen</button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label className="text-xs font-bold">Broadcast title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you broadcasting?" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
            </div>
            <div>
              <label className="text-xs font-bold">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell viewers what this broadcast is about" className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
            </div>
            <div>
              <label className="text-xs font-bold">Visibility</label>
              <div className="mt-1 grid grid-cols-3 gap-2">{[["public","Public"],["unlisted","Unlisted"],["private","Private"]].map(([id,label]) => <button key={id} type="button" onClick={() => setVisibility(id)} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${visibility === id ? "border-brand-green bg-brand-green/10" : "border-border"}`}>{label}</button>)}</div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"><ImageIcon className="size-5 text-brand-red" /><span><span className="block text-xs font-bold">Thumbnail</span><span className="block text-[11px] text-muted-foreground">Upload a custom broadcast thumbnail</span></span><Upload className="ml-auto size-4" /></button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbnail(e.target.files?.[0])} />
            {thumbnail ? <button type="button" onClick={() => setThumbnail(null)} className="flex items-center gap-1 text-xs font-semibold text-brand-red"><X className="size-3" /> Remove thumbnail</button> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2"><MessageCircle className="size-4 text-brand-red" /><h3 className="text-sm font-bold">Comments & audience</h3></div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border p-3"><div><p className="text-xs font-bold">Show comments</p><p className="text-[11px] text-muted-foreground">Allow viewers to participate during the broadcast.</p></div><button type="button" onClick={() => setComments((value) => !value)} className={`relative h-6 w-11 rounded-full ${comments ? "bg-brand-green" : "bg-secondary"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${comments ? "left-6" : "left-1"}`} /></button></div>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-xs"><Users className="size-4 text-brand-green" /> Viewer interaction will appear in the public WIGOD Live room.</div>
        </section>

        <section className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-brand-green" /><h3 className="text-sm font-bold">Overlays</h3></div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border p-3"><div><p className="text-xs font-bold">Show overlay</p><p className="text-[11px] text-muted-foreground">Place branding or lower-third text over the video.</p></div><button type="button" onClick={() => setOverlay((value) => !value)} className={`relative h-6 w-11 rounded-full ${overlay ? "bg-brand-green" : "bg-secondary"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${overlay ? "left-6" : "left-1"}`} /></button></div>
          {overlay ? <input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Overlay text" className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /> : null}
          <div className="mt-3 flex gap-2"><button type="button" className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Plus className="mx-auto mb-1 size-4" />Add overlay</button><button type="button" className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Settings2 className="mx-auto mb-1 size-4" />Overlay settings</button></div>
        </section>
      </div>

      <section className="rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Broadcast destinations</h3><p className="text-[11px] text-muted-foreground">Select where this WIGOD Studio feed should be published.</p></div><Video className="size-5 text-brand-red" /></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{destinations.map((destination) => <button key={destination.id} type="button" onClick={() => toggleDestination(destination.id)} className={`rounded-xl border p-3 text-left ${selected.includes(destination.id) ? "border-brand-green bg-brand-green/10" : "border-border"}`}><div className="flex items-center justify-between"><span className="text-xs font-bold">{destination.label}</span><span className={`size-3 rounded-full border ${selected.includes(destination.id) ? "border-brand-green bg-brand-green" : "border-border"}`} /></div><p className="mt-1 text-[10px] text-muted-foreground">{destination.detail}</p></button>)}</div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="rounded-xl border border-border px-5 py-3 text-sm font-bold">Schedule live</button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white"><Play className="size-4 fill-current" /> Start live</button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">The Studio interface is ready for the publishing/media transport layer. Destination credentials are never stored in the browser.</p>
    </div>
  )
}
