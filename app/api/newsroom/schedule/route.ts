import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const b = await request.json()
  const articleId = String(b.articleId || "")
  const startAt = String(b.startAt || "")
  if (!articleId || !startAt) return NextResponse.json({ error: "Article and start time are required" }, { status: 400 })
  const db = createAdminClient()
  const { data: article, error: articleError } = await db.from("newsroom_articles").select("id,story_id,title,dek,featured_image_url,website_url").eq("id", articleId).single()
  if (articleError || !article) return NextResponse.json({ error: articleError?.message || "Article not found" }, { status: 404 })
  const { data: event, error } = await db.from("live_events").insert({
    title: b.title || "Africa & Beyond Live: " + article.title,
    description: b.description || article.dek || null,
    start_at: startAt,
    end_at: b.endAt || null,
    status: "scheduled",
    provider: "streamyard",
    stream_url: b.streamUrl || null,
    thumbnail_url: article.featured_image_url || null,
    category: b.category || "news",
    newsroom_story_id: article.story_id,
    streamyard_status: "prepared",
  }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, event })
}
