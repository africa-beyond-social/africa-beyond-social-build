import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

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
function isAdmin(email?: string | null){return Boolean(email&&(process.env.LIVE_ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).includes(email.toLowerCase()))}
export async function POST(request:Request){
 const user=await getSessionUser(); if(!isAdmin(user?.email))return NextResponse.json({error:"Not authorised"},{status:403})
 const {id}=await request.json(); if(!id)return NextResponse.json({error:"Story id is required"},{status:400})
 const db=createAdminClient(); const {data:story,error}=await db.from("newsroom_stories").select("*").eq("id",id).single(); if(error||!story)return NextResponse.json({error:error?.message||"Story not found"},{status:404})
 if(story.status!=="approved")return NextResponse.json({error:"Only an approved story can be published"},{status:409})
 if(!story.ai_draft)return NextResponse.json({error:"The story has no approved draft"},{status:409})
 const {data:existing}=await db.from("posts").select("id").eq("newsroom_story_id",id).maybeSingle(); if(existing)return NextResponse.json({ok:true,postId:existing.id,alreadyPublished:true})
 const content=String(story.ai_draft).trim()+"\n\nSource: "+(story.source_name||"Original report")+" — "+(story.canonical_url||story.source_url)
 const thumbnail = articleThumbnailUrl(story.id, story.updated_at || story.detected_at)
 const {data:post,error:postError}=await db.from("posts").insert({user_id:user!.id,content,image_url:thumbnail || story.image_url || null,newsroom_story_id:id}).select("id").single()
 if(postError)return NextResponse.json({error:postError.message},{status:500})
 await db.from("newsroom_stories").update({status:"published",updated_at:new Date().toISOString()}).eq("id",id)
 return NextResponse.json({ok:true,postId:post.id})
}
