"use client"
import {useRef,useState,useTransition} from "react"
import {useRouter} from "next/navigation"
import {FileText,Image as ImageIcon,Paperclip,Send,Volume2} from "lucide-react"
import {sendMessage} from "@/lib/actions"
import {Button} from "@/components/ui/button"
import {toast} from "sonner"

export function MessageComposer({recipientId}:{recipientId:string}){
 const[content,setContent]=useState(""); const[file,setFile]=useState<File|null>(null); const[pending,startTransition]=useTransition(); const router=useRouter(); const inputRef=useRef<HTMLInputElement>(null)
 function submit(){const value=content.trim(); if(file){startTransition(async()=>{const fd=new FormData();fd.append("recipientId",recipientId);fd.append("file",file);const r=await fetch("/api/messages/attachment",{method:"POST",body:fd});const data=await r.json();if(!r.ok){toast.error(data.error||"File upload failed.");return}setFile(null);setContent("");if(inputRef.current)inputRef.current.value="";router.refresh()});return} if(!value)return;startTransition(async()=>{const r=await sendMessage(recipientId,value);if(!r.ok){toast.error(r.error);return}setContent("");router.refresh()})}
 return <div className="sticky bottom-0 mt-6 border-t border-border bg-background/95 py-3 backdrop-blur">
  {file&&<div className="mb-2 flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs"><span className="min-w-0 truncate">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</span><button type="button" onClick={()=>{setFile(null);if(inputRef.current)inputRef.current.value=""}} className="font-semibold">Remove</button></div>}
  <div className="flex items-end gap-2">
   <input ref={inputRef} type="file" accept="image/*,audio/*,application/pdf" className="hidden" onChange={e=>setFile(e.target.files?.[0]??null)}/>
   <Button type="button" variant="outline" onClick={()=>inputRef.current?.click()} disabled={pending} className="size-10 shrink-0 rounded-xl p-0" aria-label="Attach image, audio or PDF"><Paperclip className="size-4"/></Button>
   <textarea value={content} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit()}}} placeholder={file?"Press send to share the file…":"Write a message…"} rows={1} maxLength={2000} className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none"/>
   <Button type="button" onClick={submit} disabled={pending||(!content.trim()&&!file)} className="size-10 shrink-0 rounded-xl p-0" aria-label="Send">{pending?<span className="text-xs">…</span>:<Send className="size-4"/>}</Button>
  </div>
  <p className="mt-1 px-1 text-[10px] text-muted-foreground">Private sharing: images, audio and PDF files up to 50 MB.</p>
 </div>
}
