import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 60

function getOutputText(data: any) {
  return String(data.output_text || data.output?.flatMap((o: any) => o.content || []).map((c: any) => c.text || "").join(" ") || "").trim()
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim()
  return JSON.parse(cleaned)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 })

  const { id } = await params
  const db = createAdminClient()
  const { data: document, error: documentError } = await db
    .from("knowledge_documents")
    .select("id,title,subject,node_id,uploaded_by,processing_status")
    .eq("id", id)
    .eq("uploaded_by", user.id)
    .maybeSingle()

  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: "Knowledge document not found." }, { status: 404 })
  if (document.processing_status !== "processed") return NextResponse.json({ error: "Process the document first." }, { status: 400 })

  const { data: chunks, error: chunkError } = await db
    .from("knowledge_chunks")
    .select("id,chunk_index,heading,content,source_locator")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true })
    .limit(80)

  if (chunkError) return NextResponse.json({ error: chunkError.message }, { status: 500 })
  if (!chunks?.length) return NextResponse.json({ error: "No source chunks are available." }, { status: 400 })

  const sourceMaterial = chunks.map(c => `[SOURCE CHUNK ${c.chunk_index}] ${c.heading ? c.heading + "\n" : ""}${c.content}`).join("\n\n").slice(0, 50000)
  const prompt = `You are WIGOD Knowledge Engine AI. Transform the supplied educational source material into useful learning support without inventing facts. The source is authoritative for this task, but the AI output itself must be labelled as an AI explanation. Preserve uncertainty and do not add unsupported claims.\n\nReturn ONLY valid JSON with this shape:\n{ "overview": "...", "key_points": ["..."], "explanation": "...", "worked_example": "...", "study_questions": [{"question":"...","answer":"..."}], "verification_note":"..." }\n\nRules:\n- Base every factual statement on the supplied source chunks.\n- Keep the explanation appropriate to the document subject and education level.\n- If a worked example is not possible from the source, return an empty string.\n- Create 3-5 study questions with answers supported by the source.\n- In verification_note state that this is an AI explanation derived from the supplied source and requires human review for high-stakes academic use.\n\nDOCUMENT: ${document.title}\nSUBJECT: ${document.subject || "General"}\n\nSOURCE MATERIAL:\n${sourceMaterial}`

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt })
  })

  if (!response.ok) return NextResponse.json({ error: `AI service returned HTTP ${response.status}` }, { status: 502 })

  const data = await response.json()
  const raw = getOutputText(data)
  if (!raw) return NextResponse.json({ error: "AI returned no knowledge explanation." }, { status: 502 })

  let result: any
  try { result = parseJson(raw) } catch { return NextResponse.json({ error: "AI returned invalid knowledge JSON." }, { status: 502 }) }

  const questions = Array.isArray(result.study_questions) ? result.study_questions : []
  const body = [
    "## Overview",
    String(result.overview || "").trim(),
    "",
    "## Key points",
    ...(Array.isArray(result.key_points) ? result.key_points.map((x: unknown) => "- " + String(x)) : []),
    "",
    "## Explanation",
    String(result.explanation || "").trim(),
    result.worked_example ? "\n## Worked example\n" + String(result.worked_example).trim() : "",
    "",
    "## Verification note",
    String(result.verification_note || "AI explanation derived from supplied source material; human review is recommended for high-stakes use.").trim(),
  ].filter(Boolean).join("\n")

  const { data: records } = await db.from("knowledge_records").select("id,title").eq("created_by", user.id).contains("source_document_ids", [id])
  const fallback = records || []
  if (fallback.length) {
    for (const record of fallback) {
      await db.from("knowledge_records").update({
        body,
        summary: String(result.overview || result.explanation || "").replace(/\s+/g, " ").slice(0, 280),
        verification_status: "ai_explanation",
        updated_at: new Date().toISOString(),
      }).eq("id", record.id).eq("created_by", user.id)
    }
  }

  await db.from("knowledge_questions").delete().eq("asked_by", user.id).eq("source_document_ids", `{${id}}`)
  if (questions.length) {
    await db.from("knowledge_questions").insert(questions.slice(0, 10).map((item: any) => ({
      question: String(item?.question || "").trim(),
      node_id: document.node_id,
      answer: String(item?.answer || "").trim(),
      resolution_status: "resolved",
      source_document_ids: [id],
      asked_by: user.id,
      resolved_at: new Date().toISOString(),
    })).filter((x: any) => x.question && x.answer))
  }

  return NextResponse.json({ ok: true, document_id: id, records_updated: fallback.length, questions_created: questions.length, knowledge: result })
}