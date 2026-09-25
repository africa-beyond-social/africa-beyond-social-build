import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 60

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
  let extractionError:string|null=null
  if(type==="text/plain" || type==="text/markdown" || /\.(txt|md|markdown)$/i.test(name)) {
    extractedText=(await file.text()).slice(0,120000)
  } else if (process.env.OPENAI_API_KEY) {
    try {
      const model=process.env.OPENAI_MODEL || "gpt-5.6-luna"
      let content:any[]
      if (sourceKind==="image") {
        const signed=await db.storage.from("wigod-knowledge").createSignedUrl(path,600)
        if(signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message || "Unable to create a secure image URL")
        content=[
          {type:"input_text",text:"You are the WIGOD newsroom source decoder. Examine the submitted image carefully at high detail. Extract every legible piece of information: headline, body text, names, dates, times, places, numbers, quotations, account/page names, visible URLs and any other source-identifying information. Preserve wording where readable. If text is unclear, mark it as [unclear] rather than inventing it. Return a clean transcription followed by a short structured list of the key facts visible in the image."},
          {type:"input_image",image_url:signed.data.signedUrl,detail:"high"}
        ]
      } else {
        const bytes=Buffer.from(await file.arrayBuffer())
        const base64=bytes.toString("base64")
        content=[
          {type:"input_text",text:"Read this submitted newsroom document carefully. Extract the substantive text and factual details, preserving names, dates, places, numbers, quotations, document titles and visible source information. Do not invent anything."},
          {type:"input_file",filename:name,file_data:`data:${type};base64,${base64}`}
        ]
      }
      const ai=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{"content-type":"application/json",authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
        body:JSON.stringify({model,input:[{role:"user",content}],max_output_tokens:12000})
      })
      const data=await ai.json().catch(()=>({}))
      if(!ai.ok) throw new Error(String(data?.error?.message || `OpenAI source decoding failed (${ai.status})`))
      extractedText=String(data.output_text||"").slice(0,120000) || null
      if(!extractedText) throw new Error("The vision model returned no readable text.")
    } catch(error) {
      extractionError=error instanceof Error ? error.message : "Source decoding failed"
    }
  } else {
    extractionError="OPENAI_API_KEY is not configured in the production environment."
  }

  const sourceName=String(form.get("source_name")||"User-submitted source").trim().slice(0,200)
  const sourceUrl=String(form.get("source_url")||"").trim().slice(0,1000)
  const title=String(form.get("title")||"").trim().slice(0,300) || name.replace(/\.[^.]+$/,"")

  const {data:submission,error:submissionError}=await db.from("newsroom_source_submissions").insert({
    submitted_by:user.id,original_filename:name,mime_type:type,storage_path:path,
    source_kind:sourceKind,source_name:sourceName,source_url:sourceUrl||null,
    extracted_text:extractedText,status:"received",
    metadata:{title,source_kind:sourceKind,submitted_via:"source_inbox",decoder:"OpenAI vision",extraction_status:extractedText ? "decoded" : "failed"},\n    error:extractionError
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
  return NextResponse.json({ok:true,submissionId:submission.id,story,decoded:Boolean(extractedText),extractionError}, {status:201})
}
