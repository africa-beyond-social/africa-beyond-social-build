"use client"
import {useState} from "react"
import {Phone} from "lucide-react"
import {Button} from "@/components/ui/button"
import {VoiceCall} from "@/components/voice-call"
import {toast} from "sonner"

export function CallButton({recipientId,currentUserId}:{recipientId:string;currentUserId:string}){
 const[call,setCall]=useState<{id:string;caller_id:string;recipient_id:string;status:string;created_at:string}|null>(null);const[pending,setPending]=useState(false)
 async function start(){setPending(true);try{const r=await fetch("/api/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"create",recipientId})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCall(d.session)}catch(e){toast.error(e instanceof Error?e.message:"Could not start call")}finally{setPending(false)}}
 return <>{<Button type="button" variant="outline" onClick={start} disabled={pending} className="ml-auto rounded-full" aria-label="Call"><Phone className="mr-2 size-4"/>{pending?"Calling…":"Call"}</Button>}{call&&<VoiceCall session={call} caller currentUserId={currentUserId} onClose={()=>setCall(null)}/>}</>
}
