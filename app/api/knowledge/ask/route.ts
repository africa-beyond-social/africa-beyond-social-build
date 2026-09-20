import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"
export const maxDuration = 60

function outputText(data: any) {
  return String(data.output_text || data.output?.flatMap((o: any) => o.content || []).map((c: any) => c.text || "").join(" ") || "").trim()
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 })
  const body = await request.json().catch(() => ({}))
  const question = String(body.question || "").trim()
  if (!question) return NextResponse.json({ error: "Enter a question." }, { status: 400 })
  if (question.length > 1000) return NextResponse.json({ error: "Question is too long." }, { status: 400 })
  const db = createAdminClient()
  const { data: allowedDocuments } = await db.from("knowledge_documents").select("id").or("uploaded_by.eq." + user.id + ",access_level.eq.public")
  const allowedIds = (allowedDocuments || []).map((d: any) => d.id)
  if (!allowedIds.length) return NextResponse.json({ answer: "I could not find supporting material in your current WIGOD Knowledge Base. Add or process relevant material first.", sources: [], grounded: false })
  const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter((x: string) => x.length > 3).slice(0, 8)
  const searches = terms.length ? terms : [question]
  const chunkMap = new Map<string, any>()
  for (const term of searches) {
    const { data } = await db.from("knowledge_chunks").select("id,document_id,chunk_index,heading,content,source_locator").in("document_id", allowedIds).ilike("content", "%" + term + "%").limit(12)
    for (const row of data || []) chunkMap.set(row.id, row)
  }
  const { data: records } = await db.from("knowledge_records").select("id,title,summary,body,verification_status,source_document_ids").eq("created_by", user.id).limit(60)
  for (const record of records || []) {
    const haystack = (record.title + " " + (record.summary || "") + " " + (record.body || "")).toLowerCase()
    if (searches.some((term: string) => haystack.includes(term))) {
      const sourceIds = Array.isArray(record.source_document_ids) ? record.source_document_ids : []
      for (const sourceId of sourceIds) {
        if (!allowedIds.includes(sourceId)) continue
        const { data } = await db.from("knowledge_chunks").select("id,document_id,chunk_index,heading,content,source_locator").eq("document_id", sourceId).limit(8)
        for (const row of data || []) chunkMap.set(row.id, row)
      }
    }
  }
  const sources = Array.from(chunkMap.values()).slice(0, 30)
  if (!sources.length) return NextResponse.json({ answer: "I could not find supporting material in your current WIGOD Knowledge Base. Add or process relevant material first.", sources: [], grounded: false })
  const material = sources.map((s: any) => "[SOURCE " + s.chunk_index + "] " + (s.heading ? s.heading + "\n" : "") + s.content).join("\n\n").slice(0, 50000)
  const prompt = "You are the WIGOD Knowledge Tutor. Answer the user question using ONLY the supplied Knowledge Base source material. Do not invent facts or use outside knowledge. If the sources do not contain enough information, say so clearly. Explain at an appropriate educational level. Include source markers like [SOURCE 3] next to factual claims where possible. Return ONLY valid JSON: {\\"answer\\":\\"...\\",\\"confidence\\":\\"source-supported|partially-supported|insufficient\\",\\"follow_up_questions\\":[\\"...\\"]}.\\n\\nUSER QUESTION:\\n" + question + "\\n\\nKNOWLEDGE BASE SOURCES:\\n" + material
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt })
  })
  if (!response.ok) return NextResponse.json({ error: "AI service returned HTTP " + response.status }, { status: 502 })
  const raw = outputText(await response.json())
  if (!raw) return NextResponse.json({ error: "AI returned no answer." }, { status: 502 })
  let result: any
  try { result = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()) } catch {
    return NextResponse.json({ error: "AI returned an invalid answer format." }, { status: 502 })
  }
  return NextResponse.json({
    answer: String(result.answer || "").trim(),
    confidence: String(result.confidence || "source-supported"),
    follow_up_questions: Array.isArray(result.follow_up_questions) ? result.follow_up_questions.slice(0, 4) : [],
    grounded: true,
    sources: sources.map((s: any) => ({ chunk_index: s.chunk_index, heading: s.heading, source_locator: s.source_locator, preview: String(s.content).replace(/\s+/g, " ").slice(0, 240) }))
  })
}