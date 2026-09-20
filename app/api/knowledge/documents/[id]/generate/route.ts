import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"
import { inferTopics } from "@/lib/knowledge/processor"

export const runtime = "nodejs"
export const maxDuration = 30

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")
}

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
    .select("id,title,node_id,subject,source_url,uploaded_by,processing_status,metadata")
    .eq("id", id)
    .eq("uploaded_by", user.id)
    .maybeSingle()

  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: "Knowledge document not found." }, { status: 404 })
  if (document.processing_status !== "processed") return NextResponse.json({ error: "Process the document before generating knowledge." }, { status: 400 })

  const { data: chunks, error: chunkError } = await db
    .from("knowledge_chunks")
    .select("chunk_index,heading,content,source_locator,metadata")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true })

  if (chunkError) return NextResponse.json({ error: chunkError.message }, { status: 500 })
  if (!chunks?.length) return NextResponse.json({ error: "No knowledge chunks are available." }, { status: 400 })

  const topics = inferTopics(chunks.map(c => ({
    chunk_index: c.chunk_index,
    heading: c.heading,
    content: c.content,
    source_locator: c.source_locator || "document:body",
    metadata: c.metadata || {},
  })), document.subject).slice(0, 8)

  const derivedFrom = "processor:v1:document:" + id
  const { error: removeError } = await db
    .from("knowledge_records")
    .delete()
    .eq("created_by", user.id)
    .eq("derived_from", derivedFrom)

  if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 })

  const records: Array<Record<string, unknown>> = []
  for (const topic of topics) {
    let nodeId: string | null = document.node_id || null

    if (document.node_id) {
      const slug = slugify(topic)
      const { data: existing } = await db
        .from("knowledge_nodes")
        .select("id")
        .eq("parent_id", document.node_id)
        .eq("node_type", "topic")
        .eq("slug", slug)
        .maybeSingle()

      if (existing?.id) {
        nodeId = existing.id
      } else {
        const { data: created } = await db
          .from("knowledge_nodes")
          .insert({
            parent_id: document.node_id,
            node_type: "topic",
            name: topic,
            slug,
            metadata: { source_document_id: id, generated_by: "processor:v1" },
            created_by: user.id,
          })
          .select("id")
          .single()
        if (created?.id) nodeId = created.id
      }
    }

    const topicRegex = new RegExp("\\b" + escapeRegex(topic) + "\\b", "i")
    const relevant = chunks.filter(c => topicRegex.test(c.content) || (c.heading && topicRegex.test(c.heading)))
    const selected = (relevant.length ? relevant : chunks).slice(0, 5)
    const body = selected.map(c => {
      const heading = c.heading ? "### " + c.heading + "\n" : ""
      return heading + c.content
    }).join("\n\n").slice(0, 12000)

    records.push({
      node_id: nodeId,
      title: topic,
      record_type: "knowledge_article",
      summary: body.replace(/\s+/g, " ").slice(0, 280),
      body,
      verification_status: "source_supported",
      source_document_ids: [id],
      source_urls: document.source_url ? [document.source_url] : [],
      derived_from: derivedFrom,
      is_public: false,
      created_by: user.id,
    })
  }

  const { data: createdRecords, error: recordError } = await db
    .from("knowledge_records")
    .insert(records)
    .select("id,title,record_type,verification_status,summary,node_id,created_at")

  if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    records_created: createdRecords?.length || 0,
    topics,
    records: createdRecords || [],
  })
}