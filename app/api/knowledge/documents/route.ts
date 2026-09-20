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
  const requestedTitle = String(form.get("title") || "").trim()
  const allowedLevels = new Set(["preschool","primary","secondary","tertiary"])
  if (!allowedLevels.has(level)) return NextResponse.json({ error: "Choose Preschool, Primary, Secondary or Tertiary." }, { status: 400 })

  if (!(file instanceof File)) return NextResponse.json({ error: "A document is required." }, { status: 400 })
  const title = requestedTitle || file.name
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large. Maximum size is 20 MB." }, { status: 400 })
  const lowerName = file.name.toLowerCase()
  const extensionAllowed = /\.(pdf|doc|docx|txt|md|markdown)$/.test(lowerName)
  if (file.type && !ALLOWED.has(file.type) && !extensionAllowed) return NextResponse.json({ error: "Unsupported file type. Use PDF, Word, Markdown or text." }, { status: 400 })

  const db = createAdminClient()
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  const upload = await db.storage.from("wigod-knowledge").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 })

  let nodeId: string | null = null
  const { data: country } = await db.from("knowledge_nodes").select("id").eq("node_type","country").eq("slug","zimbabwe").maybeSingle()
  if (country && level) {
    const levelSlug = level === "preschool" ? "ecd" : level === "primary" ? "primary" : level === "secondary" ? "secondary" : "tertiary"
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
  if (file.type === "text/plain" || file.type === "text/markdown" || /\.(txt|md|markdown)$/.test(lowerName)) extractedText = await file.text()

  const haystack = `${title} ${file.name}`.toLowerCase()
  const validationFlags: string[] = []
  if (level === "tertiary" && /\b(grade|form)\s*[1-7]\b/i.test(grade)) validationFlags.push("Tertiary material is assigned to a school Grade/Form.")
  const subjectMismatchTerms: Record<string, RegExp> = { Mathematics: /\b(constitution of zimbabwe|accounting|commerce|geography|religious education|heritage studies)\b/i, Accounting: /\b(constitution of zimbabwe|mathematics|geography|religious education)\b/i, Geography: /\b(constitution of zimbabwe|accounting|commerce)\b/i, Commerce: /\b(constitution of zimbabwe|geography|religious education)\b/i }
  if (subjectMismatchTerms[subject] && subjectMismatchTerms[subject].test(haystack)) validationFlags.push(`Title/file name may not match the selected subject (${subject}).`)
  if (level === "preschool" && !/^ecd\s/i.test(grade)) validationFlags.push("Preschool material is assigned to a non-ECD learning stage.")
  if (level === "primary" && !/^grade\s/i.test(grade)) validationFlags.push("Primary material is assigned to a non-Grade learning stage.")
  if (level === "secondary" && !/^form\s/i.test(grade)) validationFlags.push("Secondary material is assigned to a non-Form learning stage.")
  if (level !== "tertiary" && /\b(university|undergraduate|postgraduate|diploma|degree|tertiary|polytechnic)\b/i.test(haystack)) validationFlags.push("Title/file name contains tertiary-level indicators.")
  if (level === "tertiary" && /\b(grade\s*[1-7]|primary school|secondary school|form\s*[1-6])\b/i.test(haystack)) validationFlags.push("Title/file name contains school-level indicators.")

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
    metadata: { original_name: file.name, mime_type: file.type, size_bytes: file.size, grade, subject, level, extension: ext, validation_flags: validationFlags, validation_status: validationFlags.length ? "review" : "clear" },
    uploaded_by: user.id,
  }).select("id,title,processing_status,storage_path,node_id,created_at").single()

  if (error) {
    await db.storage.from("wigod-knowledge").remove([path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, document: data }, { status: 201 })
}


export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from("knowledge_documents")
    .select("id,title,processing_status,education_level,subject,module,syllabus_version,metadata,created_at,updated_at")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data || [] })
}
