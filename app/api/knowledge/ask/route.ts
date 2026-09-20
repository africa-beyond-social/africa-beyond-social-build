import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"
import { normalizeText } from "@/lib/knowledge/processor"

export const runtime = "nodejs"
export const maxDuration = 60

function outputText(data: any) {
  const direct = typeof data?.output_text === "string" ? data.output_text : ""
  const nested = Array.isArray(data?.output)
    ? data.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
        .map((item: any) => typeof item?.text === "string" ? item.text : "")
        .join(" ")
    : ""
  return (direct || nested).trim()
}

function parseAiJson(raw: string) {
  const cleaned = raw.replace(/^\s*\`\`\`json\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim()
  try { return JSON.parse(cleaned) }
  catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error("AI returned an invalid answer format.")
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "Knowledge Tutor is not configured: OPENAI_API_KEY is missing in Vercel." }, { status: 503 })

  let body: any = {}
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid question request." }, { status: 400 }) }

  const question = String(body.question || "").trim()
  if (!question) return NextResponse.json({ error: "Enter a question." }, { status: 400 })
  if (question.length > 1000) return NextResponse.json({ error: "Question is too long." }, { status: 400 })

  const db = createAdminClient()
  const { data: ownDocuments, error: ownError } = await db
    .from("knowledge_documents")
    .select("id,title,subject,education_level,processing_status")
    .eq("uploaded_by", user.id)

  const { data: publicDocuments } = await db
    .from("knowledge_documents")
    .select("id,title,subject,education_level,processing_status")
    .eq("access_level", "public")

  if (ownError) return NextResponse.json({ error: "Unable to read Knowledge Base: " + ownError.message }, { status: 500 })

  const docs = [...(ownDocuments || []), ...(publicDocuments || [])]
    .filter((doc: any, index: number, all: any[]) => all.findIndex((x: any) => x.id === doc.id) === index)
  const allowedIds = docs.map((d: any) => d.id).filter(Boolean)

  if (!allowedIds.length) {
    return NextResponse.json({
      answer: "I could not find supporting material in your current WIGOD Knowledge Base. Add and process relevant material first.",
      sources: [],
      grounded: false
    })
  }

  const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter((x: string) => x.length > 2).slice(0, 12)

  // Retrieve a wider set of chunks, then rank them locally. This is more reliable than
  // requiring every individual question word to match a chunk in Supabase.
  const { data: chunks, error: chunkError } = await db
    .from("knowledge_chunks")
    .select("id,document_id,chunk_index,heading,content,source_locator")
    .in("document_id", allowedIds)
    .limit(250)

  if (chunkError) return NextResponse.json({ error: "Unable to search Knowledge Base: " + chunkError.message }, { status: 500 })

  const docMap = new Map(docs.map((d: any) => [d.id, d]))
  const ranked = (chunks || []).map((chunk: any) => {
    const haystack = String(chunk.content || "").toLowerCase()
    const heading = String(chunk.heading || "").toLowerCase()
    const doc = docMap.get(chunk.document_id)
    const docText = String(doc?.title || "").toLowerCase() + " " + String(doc?.subject || "").toLowerCase()
    let score = 0
    for (const term of terms) {
      if (haystack.includes(term)) score += 2
      if (heading.includes(term)) score += 3
      if (docText.includes(term)) score += 4
    }
    return { ...chunk, score }
  }).sort((a: any, b: any) => b.score - a.score)

  const sources = ranked.filter((x: any) => x.score > 0).slice(0, 30)
  if (!sources.length) {
    return NextResponse.json({
      answer: "I could not find supporting material for that question in the current Knowledge Base. Try a more specific question or add/process the relevant material first.",
      sources: [],
      grounded: false
    })
  }

  const material = sources.map((s: any) => {
    const doc = docMap.get(s.document_id)
    const cleanContent = normalizeText(String(s.content || ""))
    const cleanHeading = normalizeText(String(s.heading || ""))
    return "[SOURCE " + s.chunk_index + "] " +
      (doc?.title ? "DOCUMENT: " + doc.title + "\n" : "") +
      (doc?.subject ? "SUBJECT: " + doc.subject + "\n" : "") +
      (cleanHeading ? cleanHeading + "\n" : "") +
      cleanContent
  }).join("\n\n").slice(0, 50000)

  const prompt = [
    "You are the WIGOD Knowledge Tutor.",
    "Answer the user question using ONLY the supplied Knowledge Base source material.",
    "Do not invent facts or use outside knowledge.",
    "If the sources do not contain enough information, say so clearly.",
    "Explain at an appropriate educational level.",
    "Include source markers such as [SOURCE 3] next to factual claims where possible.",
    'Return ONLY valid JSON with this exact shape: {"answer":"...","confidence":"source-supported|partially-supported|insufficient","follow_up_questions":["..."]}.',
    "",
    "USER QUESTION:",
    question,
    "",
    "KNOWLEDGE BASE SOURCES:",
    material
  ].join("\n")

  let response: Response
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + key
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt
      })
    })
  } catch (error) {
    return NextResponse.json({ error: "Unable to reach the AI service. " + (error instanceof Error ? error.message : "") }, { status: 502 })
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return NextResponse.json({
      error: "AI service returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 300) : "")
    }, { status: 502 })
  }

  const raw = outputText(await response.json())
  if (!raw) return NextResponse.json({ error: "AI returned no answer." }, { status: 502 })

  let result: any
  try { result = parseAiJson(raw) }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI returned an invalid answer format." }, { status: 502 })
  }

  return NextResponse.json({
    answer: String(result.answer || "").trim(),
    confidence: String(result.confidence || "source-supported"),
    follow_up_questions: Array.isArray(result.follow_up_questions) ? result.follow_up_questions.slice(0, 4).map((q: any) => String(q)) : [],
    grounded: true,
    sources: sources.map((s: any) => {
      const doc = docMap.get(s.document_id)
      const cleanLocator = normalizeText(String(s.source_locator || ""))
      const safeLocator = /\\b(?:BDC|EMC|Tf|Tj|TJ|ActualText|Span)\\b/i.test(cleanLocator) ? "" : cleanLocator
      return {
        chunk_index: s.chunk_index,
        document_title: String(doc?.title || "Knowledge source"),
        heading: normalizeText(String(s.heading || "")),
        source_locator: safeLocator,
        preview: normalizeText(String(s.content || "")).replace(/\s+/g, " ").slice(0, 240)
      }
    })
  })
}
