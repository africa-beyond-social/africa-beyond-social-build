import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function normalize(value: string) {
  return value.toLowerCase().replace(/https?:\/\/[^\s]+/g," ").replace(/[^a-z0-9\s]/g," ").replace(/\b(the|a|an|and|of|to|in|on|for|with|from|says|said)\b/g," ").replace(/\s+/g," ").trim()
}
function tokens(value: string) { return new Set(normalize(value).split(" ").filter(w => w.length > 3)) }
function similarity(a:string,b:string) {
  const A=tokens(a), B=tokens(b); if(!A.size||!B.size) return 0
  let common=0; for(const w of A) if(B.has(w)) common++
  return common/Math.max(1,Math.min(A.size,B.size))
}
function classify(title:string,summary:string) {
  const text=(title+" "+summary).toLowerCase()
  const allegation=/\b(alleged|alleges|allegation|accused|accus(ed|ation)|claims?|claiming|reportedly|allegedly)\b/.test(text)
  const denial=/\b(denies|denied|denial|rejects|rejected)\b/.test(text)
  const statement=/\b(says|said|statement|announces|announced|according to)\b/.test(text)
  const opinion=/\b(opinion|editorial|commentary|analysis)\b/.test(text)
  if(opinion) return {storyType:"analysis",verificationClass:"opinion"}
  if(allegation) return {storyType:"allegation",verificationClass:denial?"conflicting":"allegation"}
  if(denial) return {storyType:"denial",verificationClass:"denial"}
  if(statement) return {storyType:"statement",verificationClass:"official_statement"}
  return {storyType:"news",verificationClass:"unverified"}
}

export async function POST(request:Request) {
  const user=await getSessionUser()
  if(!isAdmin(user?.email)) return NextResponse.json({error:"Not authorised"},{status:403})
  const db=createAdminClient()
  const {data:stories,error}=await db.from("newsroom_stories").select("id,title,summary,source_id,source_name,source_url,canonical_url,status,focus_areas,detected_at,published_at").in("status",["new","verifying","draft","review","held"]).order("detected_at",{ascending:false}).limit(150)
  if(error) return NextResponse.json({error:error.message},{status:500})
  const sourceIds=[...new Set((stories||[]).map((s:any)=>s.source_id).filter(Boolean))]
  const {data:sources}=sourceIds.length?await db.from("news_sources").select("id,name,priority,focus_areas").in("id",sourceIds):{data:[] as any[]}
  const sourceMap=new Map((sources||[]).map((s:any)=>[s.id,s]))
  let processed=0
  for(const story of stories||[]) {
    const source=sourceMap.get(story.source_id)
    const classification=classify(story.title||"",story.summary||"")
    const {data:related}=await db.from("newsroom_stories").select("id,title,source_id,source_name,canonical_url").neq("id",story.id).gte("detected_at",new Date(Date.now()-72*60*60*1000).toISOString()).limit(300)
    const matches=(related||[]).map((r:any)=>({...r,similarity:similarity(story.title||"",r.title||"")})).filter((r:any)=>r.similarity>=0.68).sort((a:any,b:any)=>b.similarity-a.similarity).slice(0,20)
    const independent=new Set(matches.filter((m:any)=>m.source_id&&m.source_id!==story.source_id).map((m:any)=>m.source_id)).size
    const priority=source?.priority||"standard"
    const priorityPoints=priority==="critical"?25:priority==="high"?18:priority==="standard"?10:3
    const corroborationPoints=Math.min(45,independent*15)
    const primaryPoints=story.canonical_url?5:0
    const conflictPenalty=classification.verificationClass==="conflicting"?25:classification.verificationClass==="allegation"?15:0
    const score=Math.max(0,Math.min(100,priorityPoints+corroborationPoints+primaryPoints-conflictPenalty))
    const autoReady=independent>=2&&score>=60&&!["allegation","conflicting","opinion"].includes(classification.verificationClass)
    const shortStory=(story.summary||"").length<700&&(story.title||"").length<140
    const duplicateKey=normalize(story.title||"").split(" ").slice(0,12).join("-")
    const trendingScore=Math.min(100,independent*20+(priority==="critical"?35:priority==="high"?20:5))
    const focusAreas=Array.isArray(story.focus_areas)&&story.focus_areas.length?story.focus_areas:(Array.isArray(source?.focus_areas)?source.focus_areas:[])
    await db.from("newsroom_stories").update({
      story_type:classification.storyType,verification_class:classification.verificationClass,
      editorial_route:autoReady?"automated_review":"human_review",
      editorial_watchpoints:[
        independent<2?"Seek at least one additional independent source before publication.":null,
        classification.verificationClass==="allegation"?"Preserve allegation wording and attribute the claim.":null,
        classification.verificationClass==="conflicting"?"Resolve or clearly present conflicting accounts.":null,
        !story.canonical_url?"Confirm the original source URL.":null
      ].filter(Boolean),
      focus_areas:focusAreas,verification_score:score,independent_source_count:independent,
      duplicate_key:duplicateKey,trending_score:trendingScore,short_story:shortStory,automated_review_ready:autoReady,
      updated_at:new Date().toISOString()
    }).eq("id",story.id)
    processed++
  }
  return NextResponse.json({ok:true,processed})
}
