import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { AFRICA_BEYOND_EDITORIAL_SPEC } from "@/lib/newsroom/editorial-spec"
import { getSessionUser } from "@/lib/queries"

export const maxDuration = 45
const AI_TIMEOUT_MS = 12000

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function isCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  return (request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")
}
function isTrustedSource(story:any) {
  const priority=String(story.source_priority||story.priority||"").toLowerCase()
  const source=String(story.source_name||"")
  const url=String(story.source_url||"")
  const title=String(story.title||"")
  const publisher=source.toLowerCase().startsWith("google news")
    ? (title.match(/ - ([^-]+)$/)?.[1]||"")
    : ""
  const text=(source+" "+url+" "+publisher).toLowerCase()
  const trusted=/(bbc(?: news)?|south african broadcasting corporation|sabc|zimbabwe broadcasting corporation|zbc(?: news)?|reuters|associated press|ap news|africanews|allafrica|al jazeera|the guardian|financial times|cnn|dw|deutsche welle|sky news|france 24|voice of america|voa|who|unhcr|imf|world bank|african development bank|afdb|united nations)/i.test(text)
  return priority!=="archive" && trusted
}
function slugify(value:string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,120)
}
function productionBaseUrl() {
  const raw = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || ""
  if (!raw) return ""
 return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : "https://" + raw.replace(/\/$/,"")
}
function articleThumbnailUrl(storyId:string, version?:string|null) {
  const base = productionBaseUrl()
  if (!base) return ""
  const suffix = version ? "?v=" + encodeURIComponent(version) : ""
  return base + "/api/newsroom/thumbnail/" + encodeURIComponent(storyId) + suffix
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
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),AI_TIMEOUT_MS)
  let response: Response
  try {
    response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({
    model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
    input:prompt,
    temperature:0.2,
    text:{format:{type:"json_schema",name:"africa_beyond_article",strict:true,schema:{
      type:"object",
      additionalProperties:false,
      properties:{
        title:{type:"string"},dek:{type:"string"},body_html:{type:"string"},seo_title:{type:"string"},seo_description:{type:"string"},
        category:{type:"string"},tags:{type:"array",items:{type:"string"}},live_summary:{type:"string"},live_watchpoints:{type:"array",items:{type:"string"}},editorial_state:{type:"string",enum:["ready","developing","editorial_review","hold"]},story_type:{type:"string"},current_role_status:{type:"string",enum:["verified_current","verified_former","not_established","not_applicable"]},verification_notes:{type:"array",items:{type:"string"}},requires_human_review:{type:"boolean"}
      },
      required:["title","dek","body_html","seo_title","seo_description","category","tags","live_summary","live_watchpoints","editorial_state","story_type","current_role_status","verification_notes","requires_human_review"]
    }}}
  }),signal:controller.signal})
  } finally {
    clearTimeout(timeout)
  }
  const data=await response.json()
  if(!response.ok) throw new Error(data?.error?.message||`AI service returned HTTP ${response.status}`)
  const output=String(data.output_text||"").trim() || (Array.isArray(data.output) ? data.output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[]).map((part:any)=>String(part?.text||"")).filter(Boolean).join("").trim() : "")
  if(!output) throw new Error("AI returned no structured article")
  try { return JSON.parse(output) } catch { throw new Error("AI returned invalid structured article JSON") }
}
async function logRun(db:any,id:string,patch:Record<string,any>) { await db.from("newsroom_automation_runs").update(patch).eq("id",id) }

function editorialQuality(html:string, sourceMaterial:string) {
  const text=html.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim()
  const words=text ? text.split(/\s+/).length : 0
  const paragraphs=(html.match(/<p\b/gi)||[]).length
  const headings=(html.match(/<h2\b/gi)||[]).length
  const fillerPatterns=[/it is important to note/i,/is seen as/i,/likely to/i,/expected to/i,/this highlights the importance/i,/in a significant development/i]
  const unsupportedFiller=fillerPatterns.some(pattern=>pattern.test(text) && !pattern.test(sourceMaterial))
  // Do not block legitimate short/developing reports merely because they are shorter than a
  // feature article. Briefs are allowed when the supplied evidence is sufficient.
  if(words<140) return {ok:false,reason:`Article is too short (${words} words) to publish as a useful report.`}
  if(paragraphs<2) return {ok:false,reason:`Article is underdeveloped (${paragraphs} paragraphs); at least 2 substantive paragraphs are required.`}
  if(unsupportedFiller) return {ok:false,reason:"Article contains generic or predictive filler that is not supported by the supplied source material."}
  if(headings===0 && words>900) return {ok:false,reason:"Long article needs at least one descriptive section heading."}
  return {ok:true,reason:`Editorial quality passed: ${words} words, ${paragraphs} paragraphs.`}
}

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
    await logRun(db,run.id,{stories_verified:verifiedCount,step:"article_production",message:`${verifiedCount} stories passed the automated verification gate.`});

    const cutoff48h=new Date(Date.now()-48*60*60*1000).toISOString();
    // Draft newly detected stories even when they have not yet reached the automatic-publish threshold.
    // The editorial quality gate and safeForAutoPublish check decide whether they publish or go to review.
    const {data:candidates,error:candidateError}=await db.from("newsroom_stories").select("*").is("ai_draft",null).in("status",["new","review","draft"]).gte("detected_at",cutoff48h).order("source_route",{ascending:false}).order("automated_review_ready",{ascending:false}).order("published_at",{ascending:false,nullsFirst:false}).order("detected_at",{ascending:false}).limit(2)
    if(candidateError)throw new Error(candidateError.message)
    let drafted=0,articlesReady=0,published=0
    // Process a small bounded batch per invocation so the queue clears faster without returning to long-running requests.
    // Two stories keeps the AI work within the production runtime ceiling; the next cron continues the queue.
    // Production build fix: the publication counter must remain mutable during automated distribution.
    for(const story of candidates||[]) {
      await logRun(db,run.id,{story_id:story.id,step:"ai_drafting",message:`Producing article: ${story.title}`,stories_verified:verifiedCount,stories_drafted:drafted,articles_ready:articlesReady})
      const {data:sourceMeta}=await db.from("news_sources").select("priority,source_type,name,url").eq("id",story.source_id).maybeSingle()
      story.source_priority=sourceMeta?.priority||"standard"
      story.source_type=sourceMeta?.source_type||"unknown"
      const {data:evidence}=await db.from("newsroom_evidence").select("source_name,source_url,title,published_at,summary,content_text,relation,notes").eq("story_id",story.id).order("created_at",{ascending:true}).limit(20)
      const {data:related}=await db.rpc("get_newsroom_related_sources",{p_story_id:story.id})
      const sourceRows=[
        {source_name:story.source_name,source_url:story.canonical_url||story.source_url,title:story.title,published_at:story.published_at,summary:story.summary,content_text:story.content_text,relation:"primary",source_priority:story.source_priority,source_type:story.source_type},
        ...(evidence||[]),
        ...(related||[]),
      ].filter((item:any,index:number,array:any[])=>index===array.findIndex((x:any)=>String(x.source_url||"")===String(item.source_url||"") && String(x.title||"")===String(item.title||"")))
      const material=sourceRows.map((x:any)=>JSON.stringify(x)).join("\n")
      let article:any
      try {
        article=await callOpenAI(`You are the Africa & Beyond newsroom's senior editorial writer and automated reporter.

${AFRICA_BEYOND_EDITORIAL_SPEC}

EXECUTION RULES FOR THIS STORY:
- Apply the specification to the supplied evidence, not to assumptions.
- The originating source is evidence, not a template. Reconstruct the story in Africa & Beyond's own structure and voice.
- If the source is a submitted PNG/screenshot containing an official or public statement, turn the statement into a proper news report: identify who made the statement, what was said, when/where it was issued if visible, why it matters, what is confirmed versus merely claimed, and what remains unknown.
- A statement must remain attributed. Never rewrite a person's statement as an independently established fact merely because it appears in an image.
- If the submitted image contains a denial, allegation, political claim, announcement or reaction, report it as a statement/claim and preserve the distinction between the speaker's words and independently established facts.
- TEMPORAL AND ENTITY VERIFICATION IS MANDATORY: never infer that a person currently holds a political, government, corporate, party or institutional role merely because a source describes them that way. Check the date of the source, distinguish current from former roles, and use only a current role that is established by the supplied evidence or corroborating evidence. If current status cannot be established, do not state the role as current.
- For people, organisations and office-holders, explicitly assess whether the role/status is current, former, disputed or not established. Set current_role_status accordingly and put the reason in verification_notes.
- If a claim depends on an old screenshot, repost, archived statement or undated image, treat the date/status as unresolved unless independently established.
- If the story contains a material identity, role, date, title, affiliation or leadership claim that cannot be verified from the available evidence, set requires_human_review=true and editorial_state=editorial_review or hold. Do not fill the gap by inference.
- A credible professional source may be sufficient to develop a legitimate report; do not invent a requirement for multiple independent sources.
- When the originating publisher is an established professional newsroom or primary institution, do not route the story to editorial review merely because there is only one credible source. If the supplied facts are sufficient and there is no material contradiction, classify it ready or developing and proceed with production.
- This single-source rule does NOT apply to an unidentified or user-submitted screenshot/image/PDF. Source Inbox material is source evidence to investigate, not automatic proof and not an automatic publication pass.
- If a reliable source reports a developing event, use State B when the known facts support publication with attribution and explicit uncertainty.
- Route to State C when significant allegations, credible contradictions, serious legal/factual ambiguity, or material evidence gaps make automatic publication unsafe.
- Route to State D when source reliability is poor or the claim is unsupported.
- Preserve the distinction between confirmed facts, attributed claims, allegations, disputed claims, analysis and unknowns.
- Answer the critical reader questions wherever the supplied evidence supports them: what, who, where, when, why, how, evidence, unknowns, significance and next steps.
- Never fill missing information with generic prose.
- Never invent quotes, numbers, dates, motives, context or outcomes.
- Use the source material and related evidence to produce an original report, not a paraphrase.
- Keep the article body free of a source bibliography; provenance is retained in newsroom metadata.
- Produce live_summary as 2-3 factual sentences and live_watchpoints as 3-6 concrete, story-specific points. Do not use generic placeholders.
- End the article with the Africa & Beyond signature.

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
      const finalBody=(narrative+"\n<p><strong>Africa &amp; Beyond — News | Analysis | Perspective</strong></p>").trim()
      const quality=editorialQuality(narrative,material)
      const title=String(article.title||story.title).trim()
      const record={
        story_id:story.id,title,slug:slugify(title),dek:String(article.dek||"").trim(),body_html:finalBody,
        seo_title:String(article.seo_title||title).trim(),seo_description:String(article.seo_description||article.dek||story.summary||"").trim(),
        category:String(article.category||"News").trim(),tags:Array.isArray(article.tags)?article.tags:[],
        featured_image_url:articleThumbnailUrl(story.id, story.updated_at || story.detected_at) || story.image_url || null,source_box:sourceRows.map((s:any)=>({name:s.source_name,url:s.source_url,title:s.title,relation:s.relation})),
        focus_areas:Array.isArray(story.focus_areas)?story.focus_areas:[],editorial_notes:story.source_route==="source_inbox" ? "Source Inbox direct-production route: source researched and developed for publication." : (story.automated_review_ready ? "Automated verification gate passed." : "AI draft prepared from detected source material; publication remains subject to corroboration and editorial review."),live_summary:String(article.live_summary||article.dek||story.summary||"").trim(),
        live_watchpoints:Array.isArray(article.live_watchpoints)
          ? article.live_watchpoints.map((item:any)=>String(item||"").trim()).filter(Boolean).slice(0,8)
          : (Array.isArray(story.editorial_watchpoints)?story.editorial_watchpoints:[]),signature:"Africa & Beyond — News | Analysis | Perspective",
        website_status:"ready",updated_at:new Date().toISOString()
      }
      const {data:saved,error:saveError}=await db.from("newsroom_articles").upsert(record,{onConflict:"story_id"}).select("*").single()
      if(saveError)throw new Error(saveError.message)
      drafted++; articlesReady++
      await logRun(db,run.id,{story_id:story.id,step:"automated_review",message:`Article passed production checks: ${title}`,stories_drafted:drafted,articles_ready:articlesReady})
      if(!quality.ok){
        await db.from("newsroom_stories").update({status:"review",updated_at:new Date().toISOString()}).eq("id",story.id)
        await db.from("newsroom_articles").update({editorial_notes:`Automated editorial quality gate: ${quality.reason}`,updated_at:new Date().toISOString()}).eq("id",saved.id)
        await logRun(db,run.id,{story_id:story.id,step:"editorial_review",message:quality.reason,stories_drafted:drafted,articles_ready:articlesReady})
        continue
      }
      await logRun(db,run.id,{story_id:story.id,step:"automated_review",message:quality.reason,stories_drafted:drafted,articles_ready:articlesReady})
      const cleanText=String(saved.body_html||"")
      const trustedPrimary=isTrustedSource(story)
      const editorialState=["ready","developing","editorial_review","hold"].includes(String(article.editorial_state||"")) ? String(article.editorial_state) : "editorial_review"
      const sourceSufficient=trustedPrimary||Number(story.independent_source_count||0)>=2
      const directSource=story.source_route==="source_inbox"
      const roleStatus=String(article.current_role_status||"not_established")
      const requiresHumanReview=Boolean(article.requires_human_review)
      const temporalRisk=Array.isArray(article.verification_notes) && article.verification_notes.some((note:any)=>/not established|not verified|unverified|unable to verify|cannot verify|cannot establish|unclear|undated|outdated|old screenshot|stale|conflicting|disputed|unknown current status|current status unknown|former role cannot be established/i.test(String(note||"")))
      // Source Inbox is never an automatic publication bypass. A screenshot, image or PDF
      // can be decoded and turned into a draft, but publication still requires the same
      // verification threshold as detected newsroom material, plus a clean temporal/entity check.
      // This prevents old screenshots or stale descriptions of public figures from becoming
      // current facts simply because the decoder could read them.
      const sourceInboxVerified=!directSource || (
        (trustedPrimary || Number(story.verification_score||0)>=60) &&
        sourceSufficient &&
        !requiresHumanReview &&
        !temporalRisk &&
        (roleStatus==="verified_current" || roleStatus==="verified_former" || roleStatus==="not_applicable")
      )
      const safeForAutoPublish=sourceInboxVerified &&
        (trustedPrimary || Number(story.verification_score||0)>=60) &&
        sourceSufficient &&
        (editorialState==="ready"||editorialState==="developing") &&
        story.verification_class!=="allegation" &&
        story.verification_class!=="conflicting" &&
        story.verification_class!=="opinion" &&
        (cleanText.includes("Africa &amp; Beyond — News | Analysis | Perspective")||cleanText.includes("Africa & Beyond — News | Analysis | Perspective"))
      await db.from("newsroom_articles").update({editorial_notes:(saved.editorial_notes||"")+" Editorial state: "+editorialState+". Story type: "+String(article.story_type||"news")+"." ,updated_at:new Date().toISOString()}).eq("id",saved.id)
      if(!safeForAutoPublish){
        const nextStatus=editorialState==="hold" ? "held" : "review"
        const reviewReason=directSource
          ? "Source Inbox verification required: submitted source material cannot bypass temporal/entity verification or independent corroboration."
          : "Automated publication gate not satisfied; routed to editorial review."
        await db.from("newsroom_stories").update({status:nextStatus,editorial_route:editorialState==="hold"?"hold":"human_review",updated_at:new Date().toISOString()}).eq("id",story.id)
        await db.from("newsroom_articles").update({editorial_notes:(saved.editorial_notes||"")+" "+reviewReason,updated_at:new Date().toISOString()}).eq("id",saved.id)
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
