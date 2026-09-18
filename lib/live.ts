import { createClient } from "@/lib/supabase/server"

export type LiveEvent = {
  id:string; title:string; description:string|null; location:string|null; start_at:string; end_at:string|null
  status:"scheduled"|"live"|"completed"|"cancelled"; provider:"youtube"|"other"; video_id:string|null; stream_url:string|null
  thumbnail_url:string|null; category:string; created_at:string; updated_at:string
}
export async function getUpcomingLiveEvents(limit=6):Promise<LiveEvent[]>{
 const supabase=await createClient()
 const {data,error}=await supabase.from("live_events").select("id,title,description,location,start_at,end_at,status,provider,video_id,stream_url,thumbnail_url,category,created_at,updated_at").in("status",["scheduled","live"]).gte("start_at",new Date().toISOString()).order("start_at",{ascending:true}).limit(limit)
 return error?[]:((data as LiveEvent[]|null)??[])
}