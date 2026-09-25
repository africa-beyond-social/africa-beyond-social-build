"use client"
import {useEffect,useRef,useState} from "react"
import {PhoneOff,Phone,Mic,MicOff} from "lucide-react"
import {Button} from "@/components/ui/button"

type Call={id:string;caller_id:string;recipient_id:string;status:string;created_at:string}
type Signal={id:number;sender_id:string;kind:string;payload:Record<string,unknown>}
const ICE={iceServers:[{urls:process.env.NEXT_PUBLIC_STUN_SERVER||"stun:stun.l.google.com:19302"}]}

async function api(body:Record<string,unknown>){const r=await fetch("/api/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Call error");return d}

export function VoiceCall({session,caller,currentUserId,onClose}:{session:Call;caller:boolean;currentUserId:string;onClose:()=>void}){
 const pc=useRef<RTCPeerConnection|null>(null); const stream=useRef<MediaStream|null>(null); const seen=useRef(new Set<number>()); const [status,setStatus]=useState(session.status==="ringing"?(caller?"Calling…":"Incoming call…"):"Connecting…"); const [muted,setMuted]=useState(false); const audio=useRef<HTMLAudioElement>(null)
 useEffect(()=>{let alive=true;let timer:ReturnType<typeof setInterval>|null=null
  const run=async()=>{
   try{
    if(!stream.current)stream.current=await navigator.mediaDevices.getUserMedia({audio:true,video:false})
    if(!pc.current){const conn=new RTCPeerConnection(ICE);pc.current=conn;stream.current.getTracks().forEach(t=>conn.addTrack(t,stream.current!));conn.ontrack=e=>{if(audio.current)audio.current.srcObject=e.streams[0]};conn.onicecandidate=e=>{if(e.candidate)api({action:"signal",sessionId:session.id,kind:"ice",payload:e.candidate.toJSON()})};conn.onconnectionstatechange=()=>{if(conn.connectionState==="connected")setStatus("Connected");if(["failed","disconnected","closed"].includes(conn.connectionState))setStatus("Call ended")}
    }
    if(caller&&pc.current.signalingState==="stable"&&!(pc.current.localDescription)){const offer=await pc.current.createOffer();await pc.current.setLocalDescription(offer);await api({action:"signal",sessionId:session.id,kind:"offer",payload:{type:offer.type,sdp:offer.sdp}})}
    const r=await fetch("/api/calls?session="+session.id,{cache:"no-store"});const d=await r.json();if(!alive)return
    for(const s of (d.signals||[]) as Signal[]){if(seen.current.has(s.id)||s.sender_id===currentUserId)continue;seen.current.add(s.id)
      if(s.kind==="offer"&&!caller){await pc.current!.setRemoteDescription(s.payload as RTCSessionDescriptionInit);const answer=await pc.current!.createAnswer();await pc.current!.setLocalDescription(answer);await api({action:"status",sessionId:session.id,status:"accepted"});await api({action:"signal",sessionId:session.id,kind:"answer",payload:{type:answer.type,sdp:answer.sdp}});setStatus("Connecting…")}
      else if(s.kind==="answer"&&caller){await pc.current!.setRemoteDescription(s.payload as RTCSessionDescriptionInit)}
      else if(s.kind==="ice"){try{await pc.current!.addIceCandidate(s.payload as RTCIceCandidateInit)}catch{}}
      else if(s.kind==="hangup"){onClose()}
    }
    if(d.session?.status==="rejected"||d.session?.status==="ended"||d.session?.status==="missed"){onClose()}
   }catch(e){setStatus(e instanceof Error?e.message:"Could not start call")}
  }
  run();timer=setInterval(run,1000);return()=>{alive=false;if(timer)clearInterval(timer)}
 },[session.id,caller,currentUserId])
 async function end(){try{await api({action:"status",sessionId:session.id,status:"ended"});await api({action:"signal",sessionId:session.id,kind:"hangup",payload:{}})}catch{};stream.current?.getTracks().forEach(t=>t.stop());pc.current?.close();onClose()}
 function toggleMute(){const t=stream.current?.getAudioTracks()[0];if(!t)return;t.enabled=!t.enabled;setMuted(!t.enabled)}
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-2xl"><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-green/15 text-brand-green"><Phone className="size-7"/></div><h2 className="text-lg font-bold">WIGOD Voice Call</h2><p className="mt-1 text-sm text-muted-foreground">{status}</p><audio ref={audio} autoPlay playsInline/><div className="mt-6 flex justify-center gap-3"><Button type="button" variant="outline" onClick={toggleMute} className="size-12 rounded-full p-0">{muted?<MicOff className="size-5"/>:<Mic className="size-5"/>}</Button><Button type="button" onClick={end} className="size-12 rounded-full bg-red-600 p-0 hover:bg-red-700"><PhoneOff className="size-5"/></Button></div><p className="mt-4 text-xs text-muted-foreground">Voice only. Your microphone is active while the call is connected.</p></div></div>
}
