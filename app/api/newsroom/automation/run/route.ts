import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const maxDuration = 120

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function isCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  return (request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")
}
function slugify(value:string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,120)
}
function ghostToken() {
  const key=process.env.GHOST_ADMIN_API_KEY||""
  const [id,secret]=key.split(":")
  if(!id||!secret) throw new Error("GHOST_ADMIN_API_KEY must be id:secret")
  const header=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT",kid:id})).toString("base64url")
  const now=Math.floor(Date.now()/1000)
  const payload=Buffer.from(JSON.stringify({iat:now,exp:now+300,aud:"/admin/"})).toString("base64url")
  const signing=header+"."+payload
  return signing+"."+crypto.createHmac("sha256",Buffer.from(secret,"hex")).update(signing).digest("base64url")
}
function cleanHtml(html:string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi,"")
}
function sourceBox(sources:any[]) {
  const items=sources.map((s:any)=>`<li><strong>${String(s.source_name||"Source")}</strong> — <a href="${String(s.source_url||"#")}" rel="noopener noreferrer">${String(s.title||s.source_url||"Original report")}</a></li>`).join("")
  return items ? `<div class="ab-sources-box"><p><strong>Sources</strong></p><ul>${items}</ul></div>` : ""
}
async function callOpenAI(prompt:string) {
  const key=process.env.OPENAI_API_KEY
  if(!key) throw new Error("OPENAI_API_KEY is not configured")
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({
    model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
    input:prompt,
    temperature:0.2,
    text:{format:{type:"json_schema",name:"africa_beyond_article",strict:true,schema:{
      type:"object",
      additionalProperties:false,
      properties:{
        title:{type:"string"},dek:{type:"string"},body_html:{type:"string"},seo_title:{type:"string"},seo_description:{type:"string"},
        category:{type:"string"},tags:{type:"array",items:{type:"string"}}
      },
      required:["title","dek","body_html","seo_title","seo_description","category","tags"]
    }}}
  })})
  const data=await response.json()
  if(!response.ok) throw new Error(data?.error?.message||`AI service returned HTTP ${response.status}`)
  const output=String(data.output_text||"").trim() || (Array.isArray(data.output) ? data.output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[]).map((part:any)=>String(part?.text||"")).filter(Boolean).join("").trim() : "")
  if(!output) throw new Error("AI returned no structured article")
  try { return JSON.parse(output) } catch { throw new Error("AI returned invalid structured article JSON") }
}
async function logRun(db:any,id:string,patch:Record<string,any>) { await db.from("newsroom_automation_runs").update(patch).eq("id",id) }

async function publishGhost(article:any) {
  if(!process.env.GHOST_ADMIN_API_KEY||!process.env.GHOST_ADMIN_API_URL) throw new Error("Ghost Admin API is not configured")
  const base=process.env.GHOST_ADMIN_API_URL.replace(/\/$/,"")
  const response=await fetch(base+"/ghost/api/admin/posts/?source=html",{method:"POST",headers:{"content-type":"application/json",authorization:"Ghost "+ghostToken()},body:JSON.stringify({posts:[{
    title:article.title,slug:article.slug,html:cleanHtml(article.body_html),custom_excerpt:article.dek||undefined,
    meta_title:article.seo_title||undefined,meta_description:article.seo_description||undefined,status:"published",
    feature_image:article.featured_image_url||undefined
  }]})})
  const data=await response.json()
  if(!response.ok) throw new Error(data?.errors?.[0]?.message||"Ghost publishing failed")
  const post=data.posts?.[0]
  const url=post?.url||((process.env.GHOST_PUBLICATION_URL||"").replace(/\/$/,"")+"/"+article.slug)
  return {postId:post?.id||null,url}
}

export async function GET(request:Request) {
  if(isCron(request)) return POST(request)
  const user=await getSessionUser(); if(!isAdmin(user?.email)) return NextResponse.json({error:"Not authorised"},{status:403})
  const db=createAdminClient()
  const {data,error}=await db.from("newsroom_automation_runs").select("id,run_type,status,step,message,story_id,stories_detected,stories_verified,stories_drafted,articles_ready,error,started_at,completed_at").order("started_at",{ascending:false}).limit(20)
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({runs:data||[]})
}

export async function POST(request:Request) {
  if(!isAdmin((await getSessionUser())?.email)&&!isCron(request)) return NextResponse.json({error:"Not authorised"},{status:403})
  const db=createAdminClient()
  const {data:run,error:runError}=await db.from("newsroom_automation_runs").insert({run_type:"newsroom_engine",status:"running",step:"verification",message:"Full automated newsroom template started."}).select("*").single()
  if(runError||!run)return NextResponse.json({error:runError?.message||"Unable to start automation run"},{status:500})
  try {
    await logRun(db,run.id,{step:"verification",message:"Scanning and verifying the rolling 48-hour queue…"})
    const {data:verificationResult,error:verificationError}=await db.rpc("run_newsroom_auto_verification")
    if(verificationError)throw new Error(verificationError.message)
    const verifiedCount=Number(verificationResult?.automated_review_ready||0)
    await logRun(db,run.id,{stories_verified:verifiedCount,step:"article_production",message:`${verifiedCount} stories passed the automated verification gate.`})

    const {data:candidates,error:candidateError}=await db.from("newsroom_stories").select("*").eq("automated_review_ready",true).is("ai_draft",null).in("status",["new","review","draft"]).order("published_at",{ascending:false}).limit(4)
    if(candidateError)throw new Error(candidateError.message)
    let drafted=0,articlesReady=0,published=0
    // Production build fix: the publication counter must remain mutable during automated distribution.
    for(const story of candidates||[]) {
      await logRun(db,run.id,{story_id:story.id,step:"ai_drafting",message:`Producing article: ${story.title}`,stories_verified:verifiedCount,stories_drafted:drafted,articles_ready:articlesReady})
      const {data:evidence}=await db.from("newsroom_evidence").select("source_name,source_url,title,published_at,summary,content_text,relation,notes").eq("story_id",story.id).order("created_at",{ascending:true}).limit(20)
      const sourceRows=[{source_name:story.source_name,source_url:story.canonical_url||story.source_url,title:story.title,published_at:story.published_at,summary:story.summary,content_text:story.content_text,relation:"primary"},...(evidence||[])]
      const material=sourceRows.map((x:any)=>JSON.stringify(x)).join("\n")
      let article:any
      try {
        article=await callOpenAI(`You are the Africa & Beyond newsroom production engine. Write only from the supplied material. Never invent facts, quotes, dates, people, motives or context. Preserve attribution and uncertainty. Allegations must remain allegations. Do not put a bibliography in the narrative. Return a clean news article with a strong factual headline, dek, concise opening, factual development, context and next steps only where supported. body_html may use p,h2,ul,li,strong,em,blockquote. It MUST end with <p><strong>Africa &amp; Beyond — News | Analysis | Perspective</strong></p>.

ORIGINAL STORY:
${story.title}

SOURCE MATERIAL:
${material}`)
      } catch(error) {
        const message=error instanceof Error?error.message:"AI drafting failed"
        await db.from("newsroom_stories").update({status:"review",updated_at:new Date().toISOString()}).eq("id",story.id)
        await logRun(db,run.id,{story_id:story.id,step:"editorial_review",message:`AI drafting failed; routed to editorial review: ${message}`,stories_drafted:drafted,articles_ready:articlesReady,error:message})
        continue
      }
      const narrative=String(article.body_html||"").replace(/<p><strong>Africa &amp; Beyond — News \| Analysis \| Perspective<\/strong><\/p>\s*$/,"").trim()
      const finalBody=(narrative+"\n"+sourceBox(sourceRows)+"\n<p><strong>Africa &amp; Beyond — News | Analysis | Perspective</strong></p>").trim()
      const title=String(article.title||story.title).trim()
      const record={
        story_id:story.id,title,slug:slugify(title),dek:String(article.dek||"").trim(),body_html:finalBody,
        seo_title:String(article.seo_title||title).trim(),seo_description:String(article.seo_description||article.dek||story.summary||"").trim(),
        category:String(article.category||"News").trim(),tags:Array.isArray(article.tags)?article.tags:[],
        featured_image_url:story.image_url||null,source_box:sourceRows.map((s:any)=>({name:s.source_name,url:s.source_url,title:s.title,relation:s.relation})),
        focus_areas:Array.isArray(story.focus_areas)?story.focus_areas:[],editorial_notes:"Automated verification gate passed.",live_summary:String(article.dek||story.summary||"").trim(),
        live_watchpoints:Array.isArray(story.editorial_watchpoints)?story.editorial_watchpoints:[],signature:"Africa & Beyond — News | Analysis | Perspective",
        website_status:"ready",updated_at:new Date().toISOString()
      }
      const {data:saved,error:saveError}=await db.from("newsroom_articles").upsert(record,{onConflict:"story_id"}).select("*").single()
      if(saveError)throw new Error(saveError.message)
      drafted++; articlesReady++
      await logRun(db,run.id,{story_id:story.id,step:"automated_review",message:`Article passed production checks: ${title}`,stories_drafted:drafted,articles_ready:articlesReady})
      const cleanText=String(saved.body_html||"")
      const safeForAutoPublish=Number(story.verification_score||0)>=60&&Number(story.independent_source_count||0)>=2&&(story.verification_class==="unverified"||story.verification_class==="official_statement")&&(cleanText.includes("Africa &amp; Beyond — News | Analysis | Perspective")||cleanText.includes("Africa & Beyond — News | Analysis | Perspective"))
      if(!safeForAutoPublish){
        await db.from("newsroom_stories").update({status:"review",updated_at:new Date().toISOString()}).eq("id",story.id)
        continue
      }
      await db.from("newsroom_stories").update({status:"approved",updated_at:new Date().toISOString()}).eq("id",story.id)
      await logRun(db,run.id,{story_id:story.id,step:"website_publish",message:`Publishing verified story to Africa & Beyond: ${title}`})
      const ghostPublished=await publishGhost({...saved,body_html:cleanText})
      const publishedUrl=ghostPublished.url
      const x=(title+" "+publishedUrl).slice(0,280)
      const fb=`${title}\n\n${String(article.dek||story.summary||"").trim()}\n\n${publishedUrl}`.trim()
      const tt=`${title} — ${publishedUrl} #AfricaAndBeyond #News`
      await db.from("newsroom_articles").update({website_status:"published",website_post_id:ghostPublished.postId,website_url:publishedUrl,website_published_at:new Date().toISOString(),social_x:x,social_facebook:fb,social_tiktok:tt,social_status:"generated",updated_at:new Date().toISOString()}).eq("id",saved.id)
      await db.from("newsroom_stories").update({status:"published",updated_at:new Date().toISOString()}).eq("id",story.id)
      published++
      await logRun(db,run.id,{story_id:story.id,step:"distribution_ready",message:`Published and prepared social distribution: ${publishedUrl}`,stories_drafted:drafted,articles_ready:articlesReady})
    }
    const message=`Engine completed: ${drafted} articles prepared, ${published} automatically published, ${articlesReady-published} routed to review.`
    await logRun(db,run.id,{status:"completed",step:"complete",message,stories_verified:verifiedCount,stories_drafted:drafted,articles_ready:articlesReady,completed_at:new Date().toISOString()})
    return NextResponse.json({ok:true,runId:run.id,verified:verifiedCount,drafted,articlesReady,published,routedToReview:articlesReady-published,message})
  } catch(error) {
    const message=error instanceof Error?error.message:"Automation failed"
    await logRun(db,run.id,{status:"failed",step:"error",message:"Automation stopped.",error:message,completed_at:new Date().toISOString()})
    return NextResponse.json({ok:false,runId:run.id,error:message},{status:500})
  }
}
