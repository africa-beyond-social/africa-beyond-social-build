import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isEditor(email?: string | null) {
  return Boolean(email && (process.env.NEWSROOM_EDITOR_EMAILS || process.env.LIVE_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim()
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i"))
  return match ? decode(match[1]) : ""
}

function items(xml: string) {
  const blocks = xml.match(/<(item|entry)[^>]*>[\\s\\S]*?<\/(item|entry)>/gi) || []
  return blocks.slice(0, 20).map((block) => {
    const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)
    const url = linkTag?.[1] || tag(block, "link") || tag(block, "guid") || ""
    return {
      title: tag(block, "title") || "Untitled story",
      summary: tag(block, "description") || tag(block, "summary") || tag(block, "content") || "",
      url,
      publishedAt: tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || null,
    }
  }).filter((item) => item.url)
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isEditor(user?.email)) return NextResponse.json({ error: "Not authorised." }, { status: 403 })

  const admin = createAdminClient()
  const { data: sources } = await admin.from("newsroom_sources").select("id,name,url,feed_url").eq("active", true)
  let detected = 0
  const errors: string[] = []

  for (const source of sources || []) {
    if (!source.feed_url) continue
    try {
      const response = await fetch(source.feed_url, { cache: "no-store", headers: { "user-agent": "WIGOD-Newsroom-Scout/1.0" } })
      if (!response.ok) throw new Error("HTTP " + response.status)
      const xml = await response.text()
      for (const item of items(xml)) {
        const { data: story, error } = await admin.from("newsroom_stories").upsert({
          headline: item.title.slice(0, 300),
          summary: item.summary.slice(0, 4000) || null,
          original_url: item.url,
          status: "incoming",
          verification_state: "reported",
        }, { onConflict: "original_url" }).select("id").single()
        if (error) { errors.push(source.name + ": " + error.message); continue }
        if (story) {
          const { error: sourceError } = await admin.from("newsroom_story_sources").upsert({
            story_id: story.id,
            source_id: source.id,
            source_title: item.title.slice(0, 300),
            source_url: item.url,
            source_published_at: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
          }, { onConflict: "story_id,source_id" })
          if (!sourceError) detected++
        }
      }
      await admin.from("newsroom_sources").update({ last_checked_at: new Date().toISOString() }).eq("id", source.id)
    } catch (error) {
      errors.push(source.name + ": " + (error instanceof Error ? error.message : "Scout failed"))
    }
  }

  return NextResponse.json({ detected, errors })
}
