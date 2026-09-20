import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function cleanJson(value: string) {
  return value.replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim()
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Story id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data, error } = await db.from("newsroom_articles").select("*").eq("story_id", id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ article: data })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Story id is required" }, { status: 400 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 })

  const db = createAdminClient()
  const { data: story, error } = await db.from("newsroom_stories").select("*").eq("id", id).single()
  if (error || !story) return NextResponse.json({ error: error?.message || "Story not found" }, { status: 404 })
  if (!story.ai_draft) return NextResponse.json({ error: "Generate and review the newsroom draft first" }, { status: 409 })
  const { data: evidence } = await db.from("newsroom_evidence").select("source_name,source_url,title,published_at,summary,content_text,relation,notes").eq("story_id", id)

  const prompt = `Create a publication-ready Africa & Beyond news article from the editor-reviewed draft below. Return ONLY valid JSON:
{"title":"","dek":"","body_html":"","seo_title":"","seo_description":"","category":"","tags":[]}
body_html must use clean HTML with p,h2,ul,li,strong,em,blockquote only. Do not invent facts, quotes, dates, people, motives or context. Preserve attribution and uncertainty. Keep allegations as allegations and clearly attribute source statements. Use the Africa & Beyond published-article structure: headline, excerpt/dek, clear opening, factual development, context, what happens next where relevant. Do not put a research bibliography into the article body; return sources separately in source_box. End body_html with the exact signature: <p><strong>Africa &amp; Beyond — News | Analysis | Perspective</strong></p>.
SOURCE: ${story.source_name} | ${story.canonical_url || story.source_url}
ORIGINAL TITLE: ${story.title}
EDITOR DRAFT:
${story.ai_draft}
EVIDENCE:
${JSON.stringify(evidence || [])}`

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt, temperature: 0.2 }),
  })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "AI article generation failed" }, { status: 502 })
  const raw = cleanJson(data.output_text || (data.output || []).flatMap((item: any) => item.content || []).map((c: any) => c.text || "").join(""))
  let article: any
  try { article = JSON.parse(raw) } catch { return NextResponse.json({ error: "AI returned invalid article JSON" }, { status: 502 }) }

  const title = String(article.title || story.title).trim()
  const record = {
    story_id: id, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120),
    dek: String(article.dek || "").trim(), body_html: String(article.body_html || "").trim(),
    seo_title: String(article.seo_title || title).trim(),
    seo_description: String(article.seo_description || article.dek || story.summary || "").trim(),
    category: String(article.category || "News").trim(), tags: Array.isArray(article.tags) ? article.tags : [],
    featured_image_url: story.image_url || null, website_status: "ready", updated_at: new Date().toISOString(),
  }
  const { data: saved, error: saveError } = await db.from("newsroom_articles").upsert(record, { onConflict: "story_id" }).select("*").single()
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })
  return NextResponse.json({ article: saved })
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: "Article id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data, error } = await db.from("newsroom_articles").update({
    title: body.title, dek: body.dek, body_html: body.bodyHtml, seo_title: body.seoTitle,
    seo_description: body.seoDescription, category: body.category, tags: body.tags || [],
    social_x: body.socialX, social_facebook: body.socialFacebook, social_tiktok: body.socialTiktok,
    updated_at: new Date().toISOString(),
  }).eq("id", body.id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ article: data })
}
