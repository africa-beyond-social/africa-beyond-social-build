"use client"
import { useState } from "react"
import { Download, FileText, Loader2, Paperclip } from "lucide-react"

export function MessageAttachment({ id, fileName, mimeType }: { id:string; fileName:string; mimeType:string }) {
  const [url,setUrl]=useState<string>("")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState("")
  async function openFile() {
    setLoading(true); setError("")
    const r=await fetch("/api/messages/attachment/"+encodeURIComponent(id))
    const data=await r.json()
    if (!r.ok || !data.url) { setError(data.error || "Could not open file."); setLoading(false); return }
    setUrl(data.url); setLoading(false)
  }
  if (mimeType.startsWith("image/")) return <button type="button" onClick={openFile} className="block max-w-full text-left">{url?<img src={url} alt={fileName} className="max-h-72 max-w-full rounded-xl object-contain"/>:<span className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm"><Paperclip className="size-4"/>{loading?"Loading image…":fileName}</span>}{error&&<span className="block text-xs text-red-500">{error}</span>}</button>
  if (mimeType.startsWith("audio/")) return <div className="min-w-[240px]">{url?<audio controls preload="none" src={url} className="w-full"/>:<button type="button" onClick={openFile} className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm">{loading?<Loader2 className="size-4 animate-spin"/>:<Paperclip className="size-4"/>}{loading?"Loading audio…":fileName}</button>}{error&&<div className="text-xs text-red-500">{error}</div>}</div>
  return <div>{url?<a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm underline"><FileText className="size-4"/>{fileName}</a>:<button type="button" onClick={openFile} className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm"><FileText className="size-4"/>{loading?"Opening PDF…":fileName}<Download className="size-4"/></button>}{error&&<div className="text-xs text-red-500">{error}</div>}</div>
}
