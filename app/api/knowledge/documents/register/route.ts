import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED = new Set([
  "application/pdf", "text/plain", "text/markdown", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid document details. Please retry the upload." }, { status: 400 })
  }

  const storagePath = String(body.storagePath || "")
  const name = String(body.name || "")
  const size = Number(body.size)
  const mimeType = String(body.mimeType || "")
  const level = String(body.level || "")
  const grade = String(body.grade || "")
  const subject = String(body.subject || "")
  const title = String(body.title || name).trim() || name
  const allowedLevels = new Set(["preschool", "primary", "secondary", "tertiary"])

  if (!allowedLevels.has(level)) return NextResponse.json({ error: "Choose Preschool, Primary, Secondary or Tertiary." }, { status: 400 })
  if (!name || !Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "A valid document name and size are required." }, { status: 400 })
  if (size > MAX_BYTES) return NextResponse.json({ error: "File is too large. Maximum size is 50 MB." }, { status: 413 })
  const lowerName = name.toLowerCase()
  const extensionAllowed = /\.(pdf|doc|docx|txt|md|markdown)$/.test(lowerName)
  if ((mimeType && !ALLOWED.has(mimeType) && !extensionAllowed) || !extensionAllowed) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, Word, Markdown or text." }, { status: 400 })
  }
  if (!storagePath.startsWith(`${user.id}/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "Invalid storage path for this account." }, { status: 403 })
  }

  const db = createAdminClient()
  const { data: storedFiles, error: storageListError } = await db.storage.from("wigod-knowledge").list(user.id, { search: storagePath.slice(user.id.length + 1).split("/").pop() })
  const objectName = storagePath.slice(user.id.length + 1)
  if (storageListError || !storedFiles?.some(file => file.name === objectName)) {
    return NextResponse.json({ error: "Uploaded file could not be verified in private storage. Please retry." }, { status: 400 })
  }

  const ext = name.includes(".") ? name.split(".").pop() : "bin"
  let nodeId: string | null = null
  const { data: country } = await db.from("knowledge_nodes").select("id").eq("node_type", "country").eq("slug", "zimbabwe").maybeSingle()
  if (country) {
    const levelSlug = level === "preschool" ? "ecd" : level
    const { data: levelNode } = await db.from("knowledge_nodes").select("id").eq("parent_id", country.id).eq("slug", levelSlug).maybeSingle()
    if (levelNode && grade) {
      const gradeSlug = grade.toLowerCase().replace(" ", "-")
      const { data: gradeNode } = await db.from("knowledge_nodes").select("id").eq("parent_id", levelNode.id).eq("slug", gradeSlug).maybeSingle()
      if (gradeNode && subject) {
        const { data: subjectNode } = await db.from("knowledge_nodes").select("id").eq("parent_id", gradeNode.id).ilike("name", subject).maybeSingle()
        nodeId = subjectNode?.id ?? null
      }
    }
  }

  const haystack = `${title} ${name}`.toLowerCase()
  const validationFlags: string[] = []
  if (level === "tertiary" && /\b(grade|form)\s*[1-7]\b/i.test(grade)) validationFlags.push("Tertiary material is assigned to a school Grade/Form.")
  const subjectMismatchTerms: Record<string, RegExp> = {
    Mathematics: /\b(constitution of zimbabwe|accounting|commerce|geography|religious education|heritage studies)\b/i,
    Accounting: /\b(constitution of zimbabwe|mathematics|geography|religious education)\b/i,
    Geography: /\b(constitution of zimbabwe|accounting|commerce)\b/i,
    Commerce: /\b(constitution of zimbabwe|geography|religious education)\b/i,
  }
  if (subjectMismatchTerms[subject] && subjectMismatchTerms[subject].test(haystack)) validationFlags.push(`Title/file name may not match the selected subject (${subject}).`)
  if (level === "preschool" && !/^ecd\s/i.test(grade)) validationFlags.push("Preschool material is assigned to a non-ECD learning stage.")
  if (level === "primary" && !/^grade\s/i.test(grade)) validationFlags.push("Primary material is assigned to a non-Grade learning stage.")
  if (level === "secondary" && !/^form\s/i.test(grade)) validationFlags.push("Secondary material is assigned to a non-Form learning stage.")
  if (level !== "tertiary" && /\b(university|undergraduate|postgraduate|diploma|degree|tertiary|polytechnic)\b/i.test(haystack)) validationFlags.push("Title/file name contains tertiary-level indicators.")
  if (level === "tertiary" && /\b(grade\s*[1-7]|primary school|secondary school|form\s*[1-6])\b/i.test(haystack)) validationFlags.push("Title/file name contains school-level indicators.")

  const { data, error } = await db.from("knowledge_documents").insert({
    node_id: nodeId,
    title,
    document_type: "course_material",
    storage_path: storagePath,
    education_level: level,
    subject,
    syllabus_version: grade,
    access_level: "private",
    rights_status: "user_supplied",
    processing_status: /\.(txt|md|markdown)$/.test(lowerName) ? "pending" : "pending",
    extracted_text: null,
    metadata: {
      original_name: name, mime_type: mimeType || "application/octet-stream", size_bytes: size,
      grade, subject, level, extension: ext, validation_flags: validationFlags,
      validation_status: validationFlags.length ? "review" : "clear",
    },
    uploaded_by: user.id,
  }).select("id,title,processing_status,storage_path,node_id,created_at").single()

  if (error) {
    await db.storage.from("wigod-knowledge").remove([storagePath])
    return NextResponse.json({ error: "The file was uploaded but WIGOD could not save its record. Please retry. " + error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, document: data }, { status: 201 })
}
