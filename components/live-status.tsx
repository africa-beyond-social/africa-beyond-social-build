"use client"
import {useEffect,useState} from "react"
import {Loader2,Radio} from "lucide-react"
import {LivePlayer} from "@/components/live-player"
type Broadcast={videoId:string;title:string;description:string|null}
export function LiveStatus({fallbackVideoId,fallbackTitle,channelId}:{fallbackVideoId?:string;fallbackTitle:string;channelId?:string}){
 const [status,setStatus]=useState<{configured:boolean;live:Broadcast|null}|null>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{let active=true;const check=async()=>{try{const r=await fetch("/api/live/status",{cache:"no-store"});if(!r.ok)throw new Error();const n=await r.json();if(active)setStatus(n)}catch{if(active)setStatus(null)}finally{if(active)setLoading(false)}};check();const id=window.setInterval(check,60000);return()=>{active=false;window.clearInterval(id)}},[])
 const live=status?.live, videoId=live?.videoId??(!status?.configured?fallbackVideoId:undefined)
 if(live||videoId||loading)return <div>{live?<div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-brand-red/10 px-3 py-1 text-[10px] font-bold uppercase text-brand-red">● Live now</span><span className="text-[10px] text-muted-foreground">Auto-updates</span></div>:null}<LivePlayer videoId={videoId} channelId={channelId} title={live?.title??fallbackTitle}/>{live?.description?<p className="mt-2 text-xs text-muted-foreground">{live.description}</p>:loading?<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin"/>Checking WIGOD Live…</p>:null}</div>
 return <div className="rounded-2xl border border-border bg-secondary/40 p-6 text-center"><Radio className="mx-auto size-9 text-brand-green"/><h3 className="mt-3 text-base font-bold">WIGOD Live is not broadcasting right now</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">When a connected broadcast is live, WIGOD will automatically show it here.</p></div>
}