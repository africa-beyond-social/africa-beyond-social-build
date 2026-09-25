import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

function isCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  return (request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")
}
function configured() {
  return Boolean(process.env.METRICOOL_API_TOKEN && process.env.METRICOOL_USER_ID && process.env.METRICOOL_BLOG_ID)
}
async function schedulePost(text:string, network:string, publicationDate:string, mediaUrl?:string|null) {
  const url=new URL("https://app.metricool.com/api/v2/scheduler/posts")
  url.searchParams.set("blogId",process.env.METRICOOL_BLOG_ID!)
  url.searchParams.set("userId",process.env.METRICOOL_USER_ID!)
  const body:any={publicationDate:{dateTime:publicationDate,timezone:process.env.METRICOOL_TIMEZONE||"Africa/Harare"},text,providers:[{network}],autoPublish:true,draft:false,shortener:false,saveExternalMediaFiles:Boolean(mediaUrl)}
  if(mediaUrl) body.media=[mediaUrl]
  const response=await fetch(url.toString(),{method:"POST",headers:{"Content-Type":"application/json","X-Mc-Auth":process.env.METRICOOL_API_TOKEN!},body:JSON.stringify(body)})
  const raw=await response.text()
  if(!response.ok) throw new Error("Metricool "+network+" HTTP "+response.status+": "+raw.slice(0,500))
}
export async function GET(request:Request) {
  if(!isCron(request)) return NextResponse.json({error:"Not authorised"},{status:403})
  const db=createAdminClient()
  const {data:articles,error}=await db.from("newsroom_articles").select("*").eq("website_status","published").eq("social_status","generated").order("website_published_at",{ascending:true}).limit(5)
  if(error) return NextResponse.json({error:error.message},{status:500})
  if(!articles?.length) return NextResponse.json({ok:true,queued:0,message:"No generated social posts waiting for distribution."})
  if(!configured()) return NextResponse.json({ok:false,queued:articles.length,message:"Social copy is ready; Metricool credentials are not configured."},{status:503})
  let published=0
  const results:any[]=[]
  for(const article of articles){
    const publicationDate=new Date(Date.now()+120000).toISOString().slice(0,19)
    const jobs=[["twitter",String(article.social_x||"").trim()],["facebook",String(article.social_facebook||"").trim()],["tiktok",String(article.social_tiktok||"").trim()]].filter(([,value])=>value)
    try {
      for(const [network,text] of jobs) await schedulePost(text,network,publicationDate,article.featured_image_url)
      await db.from("newsroom_articles").update({social_status:"published",updated_at:new Date().toISOString()}).eq("id",article.id)
      published++; results.push({id:article.id,status:"published",networks:jobs.map(j=>j[0])})
    } catch(error) {
      const message=error instanceof Error?error.message:"Social publishing failed"
      await db.from("newsroom_articles").update({social_status:"failed",editorial_notes:message,updated_at:new Date().toISOString()}).eq("id",article.id)
      results.push({id:article.id,status:"failed",error:message})
    }
  }
  return NextResponse.json({ok:true,queued:articles.length,published,results})
}
