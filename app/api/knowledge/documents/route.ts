import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const form = await request.formData()
  const file = form.get("file")
  const level = String(form.get("level") || "")
  const grade = String(form.get("grade") || "")
  const subject = String(form.get("subject") || "")
  const requestedTitle = String(form.get("title") || "").trim()\n  const title = requestedTitle || file.name

  if (!(file instanceof File)) return NextResponse.json({ error: "A document is required." }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large. Maximum size is 20 MB." }, { status: 400 })
  if (file.type && !ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported file type. Use PDF, Word, Markdown or text." }, { status: 400 })

  const db = createAdminClient()
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  const upload = await db.storage.from("wigod-knowledge").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 })

  let nodeId: string | null = null
  const { data: country } = await db.from("knowledge_nodes").select("id").eq("node_type","country").eq("slug","zimbabwe").maybeSingle()
  if (country && level) {
    const levelSlug = level === "primary" ? "primary" : level === "secondary" ? "secondary" : level.toLowerCase()
    const { data: levelNode } = await db.from("knowledge_nodes").select("id").eq("parent_id",country.id).eq("slug",levelSlug).maybeSingle()
    if (levelNode && grade) {
      const gradeSlug = grade.toLowerCase().replace(" ","-")
      const { data: gradeNode } = await db.from("knowledge_nodes").select("id").eq("parent_id",levelNode.id).eq("slug",gradeSlug).maybeSingle()
      if (gradeNode && subject) {
        const { data: subjectNode } = await db.from("knowledge_nodes").select("id").eq("parent_id",gradeNode.id).ilike("name",subject).maybeSingle()
        nodeId = subjectNode?.id ?? null
      }
    }
  }

  let extractedText: string | null = null
  if (file.type === "text/plain" || file.type === "text/markdown") extractedText = await file.text()

  const { data, error } = await db.from("knowledge_documents").insert({
    node_id: nodeId,
    title: title || file.name,
    document_type: "course_material",
    storage_path: path,
    education_level: level,
    subject,
    syllabus_version: grade,
    access_level: "private",
    rights_status: "user_supplied",
    processing_status: extractedText ? "processed" : "pending",
    extracted_text: extractedText,
    metadata: { original_name: file.name, mime_type: file.type, size_bytes: file.size, grade, subject, level, extension: ext },
    uploaded_by: user.id,
  }).select("id,title,processing_status,storage_path,node_id,created_at").single()

  if (error) {
    await db.storage.from("wigod-knowledge").remove([path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, document: data }, { status: 201 })
}
