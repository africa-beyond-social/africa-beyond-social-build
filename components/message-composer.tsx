"use client"
import {useState,useTransition} from "react"
import {useRouter} from "next/navigation"
import {Send} from "lucide-react"
import {sendMessage} from "@/lib/actions"
import {Button} from "@/components/ui/button"
import {toast} from "sonner"
export function MessageComposer({recipientId}:{recipientId:string}){const[content,setContent]=useState("");const[pending,startTransition]=useTransition();const router=useRouter();function submit(){const value=content.trim();if(!value)return;startTransition(async()=>{const r=await sendMessage(recipientId,value);if(!r.ok){toast.error(r.error);return}setContent("");router.refresh()})}return <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-border bg-background/95 py-3 backdrop-blur"><textarea value={content} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit()}}} placeholder="Write a message…" rows={1} maxLength={2000} className="min-h-10 flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none"/><Button type="button" onClick={submit} disabled={pending||!content.trim()} className="rounded-xl"><Send className="size-4"/></Button></div>}
