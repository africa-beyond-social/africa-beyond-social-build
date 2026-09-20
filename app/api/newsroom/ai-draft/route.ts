import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"
function isAdmin(email?: string | null) { return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase())) }
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!isAdmin(user?.email)) return NextResponse.json({error:"Not authorised"},{status:403})
  const {id}=await request.json(); if(!id) return NextResponse.json({error:"Story id is required"},{status:400})
  const key=process.env.OPENAI_API_KEY; if(!key) return NextResponse.json({error:"OPENAI_API_KEY is not configured"},{status:503})
  const db=createAdminClient(); const {data:story,error}=await db.from("newsroom_stories").select("*").eq("id",id).single(); if(error||!story)return NextResponse.json({error:error?.message||"Story not found"},{status:404})
  const {data:evidence}=await db.from("newsroom_evidence").select("source_name,source_url,title,published_at,summary,content_text,relation").eq("story_id",id).order("created_at",{ascending:true}).limit(20)
  const material=[{source:story.source_name,url:story.canonical_url||story.source_url,title:story.title,summary:story.summary,content:story.content_text,relation:"primary"},...(evidence||[])].map((x:any)=>JSON.stringify(x)).join("\\n")
  const prompt=`You are WIGOD Newsroom AI. Prepare a factual, attributed newsroom draft from ONLY the supplied source material. Do not invent facts, quotes, dates, people, motives or context. Clearly attribute disputed or single-source claims. If evidence conflicts, say so. Produce: headline, 2-4 paragraph article, and a short verification note. End with: "AI draft — requires editorial review."\\n\\nSOURCE MATERIAL:\\n${material}`
  const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",input:prompt})})
  if(!res.ok)return NextResponse.json({error:`AI service returned HTTP ${res.status}`},{status:502})
  const data=await res.json(); const draft=String(data.output_text||data.output?.flatMap((o:any)=>o.content||[]).map((c:any)=>c.text||"").join(" ")||"").trim(); if(!draft)return NextResponse.json({error:"AI returned no draft"},{status:502})
  const {data:saved,error:saveError}=await db.from("newsroom_stories").update({ai_draft:draft,status:"draft",updated_at:new Date().toISOString()}).eq("id",id).select("*").single(); if(saveError)return NextResponse.json({error:saveError.message},{status:500})
  return NextResponse.json({ok:true,story:saved})
}
