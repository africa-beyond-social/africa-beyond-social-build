import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const maxDuration = 120

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

function isCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  return (request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")
}

async function logRun(db: any, id: string, patch: Record<string, any>) {
  await db.from("newsroom_automation_runs").update(patch).eq("id", id)
}

async function callOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY is not configured")
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `AI service returned HTTP ${response.status}`)
  const output = String(data.output_text || (data.output || []).flatMap((o: any) => o.content || []).map((c: any) => c.text || "").join("") || "").trim()
  if (!output) throw new Error("AI returned no output")
  return output
}

function cleanJson(value: string) {
  return value.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email) && !isCron(request)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const db = createAdminClient()
  const { data, error } = await db.from("newsroom_automation_runs")
    .select("id,run_type,status,step,message,story_id,stories_detected,stories_verified,stories_drafted,articles_ready,error,started_at,completed_at")
    .order("started_at", { ascending: false }).limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data || [] })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email) && !isCron(request)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })

  const db = createAdminClient()
  const { data: run, error: runError } = await db.from("newsroom_automation_runs").insert({
    run_type: "newsroom_engine", status: "running", step: "verification", message: "Automatic newsroom engine started."
  }).select("*").single()
  if (runError || !run) return NextResponse.json({ error: runError?.message || "Unable to start automation run" }, { status: 500 })

  try {
    await logRun(db, run.id, { step: "verification", message: "Cross-checking the rolling 48-hour queue…" })

    const { data: verificationResult, error: verificationError } = await db.rpc("run_newsroom_auto_verification")
    if (verificationError) throw new Error(verificationError.message)

    const verifiedCount = Number(verificationResult?.automated_review_ready || 0)
    await logRun(db, run.id, {
      stories_verified: verifiedCount,
      step: "ai_drafting",
      message: `Verification complete. ${verifiedCount} stories are eligible for automated drafting.`
    })

    const { data: candidates, error: candidateError } = await db.from("newsroom_stories")
      .select("*")
      .eq("automated_review_ready", true)
      .is("ai_draft", null)
      .in("status", ["new", "review", "draft"])
      .order("published_at", { ascending: false })
      .limit(4)
    if (candidateError) throw new Error(candidateError.message)

    let drafted = 0
    let articlesReady = 0

    for (const story of candidates || []) {
      await logRun(db, run.id, {
        story_id: story.id,
        step: "ai_drafting",
        message: `Newsroom AI is drafting: ${story.title}`,
        stories_drafted: drafted,
        articles_ready: articlesReady
      })

      const { data: evidence } = await db.from("newsroom_evidence")
        .select("source_name,source_url,title,published_at,summary,content_text,relation,notes")
        .eq("story_id", story.id).order("created_at", { ascending: true }).limit(20)

      const material = [
        { source: story.source_name, url: story.canonical_url || story.source_url, title: story.title, summary: story.summary, content: story.content_text, relation: "primary" },
        ...(evidence || [])
      ].map((x: any) => JSON.stringify(x)).join("\n")

      const draftPrompt = `You are WIGOD Newsroom AI. Prepare a factual, attributed newsroom draft from ONLY the supplied source material. Do not invent facts, quotes, dates, people, motives or context. Clearly attribute disputed or single-source claims. If evidence conflicts, say so. Produce a headline followed by 2-4 concise paragraphs and a short verification note. End with: "AI draft — requires editorial review."

SOURCE MATERIAL:
${material}`
      const draft = await callOpenAI(draftPrompt)

      const { error: draftError } = await db.from("newsroom_stories").update({
        ai_draft: draft,
        status: "draft",
        updated_at: new Date().toISOString()
      }).eq("id", story.id)
      if (draftError) throw new Error(draftError.message)
      drafted++

      await logRun(db, run.id, {
        story_id: story.id,
        step: "article_production",
        message: `Draft complete. Formatting publication article: ${story.title}`,
        stories_drafted: drafted
      })

      const articlePrompt = `Create a publication-ready Africa & Beyond news article from the newsroom draft below. Return ONLY valid JSON:
{"title":"","dek":"","body_html":"","seo_title":"","seo_description":"","category":"","tags":[]}
body_html must use only p,h2,ul,li,strong,em,blockquote. Do not invent facts, quotes, dates, people, motives or context. Preserve attribution and uncertainty. Keep allegations as allegations and clearly attribute source statements. End body_html with the exact signature: <p><strong>Africa &amp; Beyond — News | Analysis | Perspective</strong></p>.

SOURCE: ${story.source_name} | ${story.canonical_url || story.source_url}
ORIGINAL TITLE: ${story.title}
EDITORIAL DRAFT:
${draft}
EVIDENCE:
${JSON.stringify(evidence || [])}`
      const rawArticle = cleanJson(await callOpenAI(articlePrompt))
      let article: any
      try { article = JSON.parse(rawArticle) } catch { throw new Error("AI returned invalid article JSON") }

      const title = String(article.title || story.title).trim()
      const record = {
        story_id: story.id,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120),
        dek: String(article.dek || "").trim(),
        body_html: String(article.body_html || "").trim(),
        seo_title: String(article.seo_title || title).trim(),
        seo_description: String(article.seo_description || article.dek || story.summary || "").trim(),
        category: String(article.category || "News").trim(),
        tags: Array.isArray(article.tags) ? article.tags : [],
        featured_image_url: story.image_url || null,
        website_status: "ready",
        updated_at: new Date().toISOString()
      }
      const { error: articleError } = await db.from("newsroom_articles").upsert(record, { onConflict: "story_id" })
      if (articleError) throw new Error(articleError.message)

      const { error: statusError } = await db.from("newsroom_stories").update({
        status: "review",
        editorial_route: "automated_review",
        updated_at: new Date().toISOString()
      }).eq("id", story.id)
      if (statusError) throw new Error(statusError.message)

      articlesReady++
      await logRun(db, run.id, {
        story_id: story.id,
        step: "editorial_review",
        message: `Article ready for exception review: ${title}`,
        stories_drafted: drafted,
        articles_ready: articlesReady
      })
    }

    const message = candidates?.length
      ? `Engine finished: ${drafted} drafts and ${articlesReady} publication articles prepared. Stories remain in REVIEW until the editorial safety gate is implemented.`
      : "Engine finished: no new auto-ready stories required AI processing."

    await logRun(db, run.id, {
      status: "completed",
      step: "complete",
      message,
      stories_drafted: drafted,
      articles_ready: articlesReady,
      completed_at: new Date().toISOString()
    })
    return NextResponse.json({ ok: true, runId: run.id, verified: verifiedCount, drafted, articlesReady, message })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed"
    await logRun(db, run.id, { status: "failed", step: "error", message: "Automation stopped.", error: message, completed_at: new Date().toISOString() })
    return NextResponse.json({ ok: false, runId: run.id, error: message }, { status: 500 })
  }
}
