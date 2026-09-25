"use client"
import {useEffect,useState} from "react"
import {Phone,PhoneOff} from "lucide-react"
import {Button} from "@/components/ui/button"
import {VoiceCall} from "@/components/voice-call"
import {toast} from "sonner"

type Call={id:string;caller_id:string;recipient_id:string;status:string;created_at:string}
export function IncomingCallListener({currentUserId}:{currentUserId:string}){
 const[call,setCall]=useState<Call|null>(null)
 useEffect(()=>{let alive=true;const check=async()=>{if(call)return;try{const r=await fetch("/api/calls?incoming=1",{cache:"no-store"});const d=await r.json();if(alive&&d.calls?.[0])setCall(d.calls[0])}catch{}};check();const t=setInterval(check,2000);return()=>{alive=false;clearInterval(t)}},[call])
 if(!call)return null
 async function reject(){try{await fetch("/api/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"status",sessionId:call.id,status:"rejected"})})}catch{};setCall(null);toast("Call declined")}
 return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-2xl"><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-green/15 text-brand-green"><Phone className="size-7"/></div><h2 className="text-lg font-bold">Incoming WIGOD call</h2><p className="mt-1 text-sm text-muted-foreground">Someone is calling you.</p><div className="mt-6 flex justify-center gap-3"><Button type="button" variant="outline" onClick={reject} className="rounded-full"><PhoneOff className="mr-2 size-4"/>Decline</Button><Button type="button" onClick={()=>{}} className="rounded-full">Answer</Button></div>{call&&<div className="hidden"><VoiceCall session={call} caller={false} currentUserId={currentUserId} onClose={()=>setCall(null)}/></div>}</div></div>
}
