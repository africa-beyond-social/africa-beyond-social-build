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
  const { data: article, error: articleError } = await db.from("newsroom_articles").select("id,story_id,title,dek,featured_image_url,website_url,live_summary,live_watchpoints,social_x,social_facebook,social_tiktok").eq("id", articleId).single()
  if (articleError || !article) return NextResponse.json({ error: articleError?.message || "Article not found" }, { status: 404 })
  const { data: story } = await db.from("newsroom_stories").select("status").eq("id", article.story_id).single()
  if (!story || story.status !== "published") return NextResponse.json({ error: "Publish the approved article to Africa & Beyond before scheduling a programme" }, { status: 409 })
  const start = new Date(startAt)
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) return NextResponse.json({ error: "Programme start time must be a valid future time" }, { status: 400 })
  if (b.endAt) {
    const end = new Date(String(b.endAt))
    if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return NextResponse.json({ error: "Programme end time must be after the start time" }, { status: 400 })
  }
  const websiteLinks = [{ title: article.title, url: article.website_url }].filter((item) => item.url)
  const storyIds = Array.from(new Set([article.story_id, ...(Array.isArray(b.storyIds) ? b.storyIds : [])].filter(Boolean)))
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
    newsroom_story_ids: storyIds,
    website_links: websiteLinks,
    editor_notes: b.editorNotes || null,
    live_summary: article.live_summary || null,
    watchpoints: Array.isArray(article.live_watchpoints) ? article.live_watchpoints : [],
    broadcast_brief: b.broadcastBrief || article.live_summary || null,
    social_hook_x: article.social_x || null,
    social_hook_facebook: article.social_facebook || null,
    social_hook_tiktok: article.social_tiktok || null,
    streamyard_status: "prepared",
  }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, event })
}
