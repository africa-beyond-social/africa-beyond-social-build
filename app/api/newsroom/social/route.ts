import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Article id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data: article, error } = await db.from("newsroom_articles").select("*").eq("id", id).single()
  if (error || !article) return NextResponse.json({ error: error?.message || "Article not found" }, { status: 404 })
  const prompt = `Create platform-specific distribution copy for this approved Africa & Beyond article. Return ONLY JSON:
{"x":"","facebook":"","tiktok":""}
X must be concise and fit within 280 characters. Facebook should be a strong short summary with a link placeholder [ARTICLE LINK]. TikTok should be a short caption plus 3-5 relevant hashtags. Do not invent facts.
TITLE: ${article.title}
DEK: ${article.dek || ""}
ARTICLE:
${article.body_html}`
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt, temperature: 0.2 })
  })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Social copy generation failed" }, { status: 502 })
  const raw = String(data.output_text || (data.output || []).flatMap((item: any) => item.content || []).map((c: any) => c.text || "").join("")).replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim()
  let copy: any
  try { copy = JSON.parse(raw) } catch { return NextResponse.json({ error: "AI returned invalid social JSON" }, { status: 502 }) }
  const { data: saved, error: saveError } = await db.from("newsroom_articles").update({
    social_x: String(copy.x || "").slice(0, 280), social_facebook: String(copy.facebook || ""), social_tiktok: String(copy.tiktok || ""), social_status: "generated", updated_at: new Date().toISOString()
  }).eq("id", id).select("*").single()
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })
  return NextResponse.json({ article: saved })
}
