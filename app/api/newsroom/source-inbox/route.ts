import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
])

function kind(type:string, name:string) {
  const t=type.toLowerCase(), n=name.toLowerCase()
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf"
  if (t.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(n)) return "image"
  return "document"
}

export async function POST(request:Request) {
  const user=await getSessionUser()
  if(!user) return NextResponse.json({error:"Please sign in first."},{status:401})
  const form=await request.formData()
  const file=form.get("file")
  if(!(file instanceof File)) return NextResponse.json({error:"Choose a screenshot, image or PDF first."},{status:400})
  if(file.size>MAX_BYTES) return NextResponse.json({error:"Source is too large. Maximum size is 25 MB."},{status:400})
  const type=file.type||"application/octet-stream"
  const name=file.name||"source"
  const extensionAllowed=/\.(pdf|png|jpe?g|webp|txt|md|markdown)$/i.test(name)
  if(!ALLOWED.has(type) && !extensionAllowed) return NextResponse.json({error:"Unsupported source. Use PDF, PNG, JPG, WEBP, TXT or Markdown."},{status:400})

  const db=createAdminClient()
  const path=`source-inbox/${user.id}/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g,"_")}`
  const upload=await db.storage.from("wigod-knowledge").upload(path,file,{contentType:type,upsert:false})
  if(upload.error) return NextResponse.json({error:upload.error.message},{status:500})

  const sourceKind=kind(type,name)
  let extractedText:string|null=null
  if(type==="text/plain" || type==="text/markdown" || /\.(txt|md|markdown)$/i.test(name)) extractedText=(await file.text()).slice(0,120000)

  const sourceName=String(form.get("source_name")||"User-submitted source").trim().slice(0,200)
  const sourceUrl=String(form.get("source_url")||"").trim().slice(0,1000)
  const title=String(form.get("title")||"").trim().slice(0,300) || name.replace(/\.[^.]+$/,"")

  const {data:submission,error:submissionError}=await db.from("newsroom_source_submissions").insert({
    submitted_by:user.id,original_filename:name,mime_type:type,storage_path:path,
    source_kind:sourceKind,source_name:sourceName,source_url:sourceUrl||null,
    extracted_text:extractedText,status:"received",
    metadata:{title,source_kind:sourceKind,submitted_via:"source_inbox"}
  }).select("*").single()
  if(submissionError){
    await db.storage.from("wigod-knowledge").remove([path])
    return NextResponse.json({error:submissionError.message},{status:500})
  }

  const storyUrl=sourceUrl || `source-inbox://${submission.id}`
  const {data:story,error:storyError}=await db.from("newsroom_stories").insert({
    title,
    source_name:sourceName,
    source_url:storyUrl,
    canonical_url:sourceUrl||null,
    detected_at:new Date().toISOString(),
    summary:extractedText ? extractedText.slice(0,1200) : `User-submitted ${sourceKind} source: ${name}`,
    content_text:extractedText || null,
    image_url:sourceKind==="image" ? null : null,
    status:"new",
    confidence:"unverified",
    verification_class:"unverified",
    editorial_route:"automated_review",
    source_route:"source_inbox",
    story_type:"news"
  }).select("id,title,status,source_route").single()

  if(storyError){
    await db.from("newsroom_source_submissions").update({status:"failed",error:storyError.message,updated_at:new Date().toISOString()}).eq("id",submission.id)
    return NextResponse.json({error:storyError.message},{status:500})
  }

  await db.from("newsroom_source_submissions").update({status:"ready",newsroom_story_id:story.id,updated_at:new Date().toISOString()}).eq("id",submission.id)
  return NextResponse.json({ok:true,submissionId:submission.id,story}, {status:201})
}
