import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export async function GET() {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const db = createAdminClient()
  const { data: events, error } = await db.from("live_events").select("*").order("start_at", { ascending: true }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const storyIds = Array.from(new Set((events || []).flatMap((event: any) => {
    const ids = Array.isArray(event.newsroom_story_ids) ? event.newsroom_story_ids : []
    return [event.newsroom_story_id, ...ids].filter(Boolean)
  })))
  const { data: stories } = storyIds.length
    ? await db.from("newsroom_stories").select("id,title,summary,content_text,source_name,source_url,canonical_url,confidence,verification_notes,verification_class,editorial_watchpoints,status").in("id", storyIds)
    : { data: [] as any[] }
  const storyMap = new Map((stories || []).map((s: any) => [s.id, s]))

  const rows = (events || []).map((event: any) => {
    const ids = Array.from(new Set([event.newsroom_story_id, ...(Array.isArray(event.newsroom_story_ids) ? event.newsroom_story_ids : [])].filter(Boolean)))
    const eventStories = ids.map(id => storyMap.get(id)).filter(Boolean)
    return {
      ...event,
      stories: eventStories,
      website_links: event.website_links || eventStories.map((s: any) => ({ title: s.title, url: s.canonical_url || s.source_url })),
      watchpoints: event.watchpoints?.length ? event.watchpoints : eventStories.flatMap((s: any) => Array.isArray(s.editorial_watchpoints) ? s.editorial_watchpoints : []),
    }
  })
  return NextResponse.json({ events: rows })
}
