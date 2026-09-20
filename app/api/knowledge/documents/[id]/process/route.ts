import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"
import { buildChunks, extractDocxText, extractPdfText, inferTopics, normalizeText } from "@/lib/knowledge/processor"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { data: document, error: documentError } = await db
    .from("knowledge_documents")
    .select("id,title,storage_path,processing_status,uploaded_by,subject,metadata,extracted_text")
    .eq("id", id)
    .eq("uploaded_by", user.id)
    .maybeSingle()

  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: "Knowledge document not found." }, { status: 404 })
  if (!document.storage_path) return NextResponse.json({ error: "This document has no stored source file." }, { status: 400 })

  await db.from("knowledge_documents").update({ processing_status: "processing" }).eq("id", id)

  try {
    const download = await db.storage.from("wigod-knowledge").download(document.storage_path)
    if (download.error || !download.data) throw new Error(download.error?.message || "Unable to download source document.")

    const buffer = Buffer.from(await download.data.arrayBuffer())
    const metadata = (document.metadata || {}) as Record<string, unknown>
    const mime = String(metadata.mime_type || "")
    const assignedLevel = String(metadata.level || "")
    const assignedGrade = String(metadata.grade || "")
    const validationFlags = Array.isArray(metadata.validation_flags) ? [...(metadata.validation_flags as string[])] : []
    const sample = `${document.title} ${String(metadata.original_name || "")} ${assignedLevel} ${assignedGrade}`
    if (assignedLevel === "tertiary" && /\\b(grade|form)\\s*[1-7]\\b/i.test(sample)) validationFlags.push("Tertiary material is assigned to a school Grade/Form.")
    if (assignedLevel !== "tertiary" && /\\b(university|undergraduate|postgraduate|diploma|degree|tertiary|polytechnic)\\b/i.test(text || sample)) validationFlags.push("Document text or title contains tertiary-level indicators.")
    if (assignedLevel === "tertiary" && /\\b(grade\\s*[1-7]|primary school|secondary school|form\\s*[1-6])\\b/i.test(text || sample)) validationFlags.push("Document text contains school-level indicators.")
    const name = String(metadata.original_name || document.title || "").toLowerCase()

    let text = ""
    if (mime === "text/plain" || mime === "text/markdown" || /\.(txt|md|markdown)$/.test(name)) {
      text = await download.data.text()
    } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
      text = extractPdfText(buffer)
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      text = extractDocxText(buffer)
    } else {
      throw new Error("Legacy .doc files are not supported by this processor yet. Please convert the file to .docx or PDF.")
    }

    text = normalizeText(text)
    if (!text) throw new Error("No readable text was extracted from this document.")

    if (assignedLevel === "tertiary" && /\\b(grade\\s*[1-7]|form\\s*[1-6])\\b/i.test(text)) {
      validationFlags.push("Extracted content references school Grades/Forms; investigate before using it as tertiary material.")
    }

    const chunks = buildChunks(text)
    if (!chunks.length) throw new Error("The document was extracted but no knowledge chunks could be created.")

    const topics = inferTopics(chunks, document.subject)

    const { error: deleteError } = await db.from("knowledge_chunks").delete().eq("document_id", id)
    if (deleteError) throw new Error(deleteError.message)

    const { error: chunkError } = await db.from("knowledge_chunks").insert(
      chunks.map(chunk => ({
        document_id: id,
        chunk_index: chunk.chunk_index,
        heading: chunk.heading,
        content: chunk.content,
        source_locator: chunk.source_locator,
        metadata: { ...chunk.metadata, topic_candidates: topics },
      }))
    )
    if (chunkError) throw new Error(chunkError.message)

    const mergedMetadata = {
      ...metadata,
      processor_version: "v1",
      chunk_count: chunks.length,
      topic_candidates: topics,
      extracted_characters: text.length,
      processed_at: new Date().toISOString(),
      validation_flags: [...new Set(validationFlags)],
      validation_status: validationFlags.length ? "review" : "clear",
    }

    const { data: updated, error: updateError } = await db
      .from("knowledge_documents")
      .update({
        extracted_text: text,
        processing_status: "processed",
        metadata: mergedMetadata,
      })
      .eq("id", id)
      .select("id,title,processing_status,metadata,updated_at")
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({
      ok: true,
      document: updated,
      chunks_created: chunks.length,
      topics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge processing failed."
    await db.from("knowledge_documents").update({
      processing_status: "failed",
      metadata: {
        ...((document.metadata || {}) as Record<string, unknown>),
        processor_version: "v1",
        processing_error: message,
        failed_at: new Date().toISOString(),
      },
    }).eq("id", id)
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
