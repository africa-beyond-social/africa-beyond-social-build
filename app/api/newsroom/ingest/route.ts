import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const maxDuration = 30

function strip(value: string) {
  return value.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}
function firstTag(block: string, tag: string) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"))
  return m ? strip(m[1]) : ""
}
function rawTag(block: string, tag: string) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"))
  return m ? m[1].trim() : ""
}
function itemValue(block: string, tags: string[]) {
  for (const tag of tags) { const value = firstTag(block, tag); if (value) return value }
  return ""
}
function itemLink(block: string) {
  const rss = firstTag(block, "link")
  if (rss) return rss
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)
  return atom ? atom[1] : ""
}
function itemImage(block: string) {
  const media = block.match(/<(?:media:content|enclosure)[^>]+url=["']([^"']+)["']/i)
  return media ? media[1] : ""
}
async function auth(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  const user = await getSessionUser()
  const admins = (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean)
  return Boolean(user?.email && admins.includes(user.email.toLowerCase()))
}
function blocks(xml: string) {
  const rss = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const atom = xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
  return [...rss, ...atom]
}

export async function GET(request: Request) {
  if (!(await auth(request))) return NextResponse.json({ error: "Not authorised" }, { status: 401 })
  const db = createAdminClient()
  const { data: sources, error } = await db.from("news_sources").select("*").eq("active", true).in("source_type", ["rss", "google_news"]).eq("monitoring_enabled", true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let detected = 0
  let checked = 0
  for (const source of sources ?? []) {
    checked++
    try {
      const response = await fetch(source.url, { headers: { "user-agent": "WIGOD-Newsroom/1.0" }, cache: "no-store" })
      if (!response.ok) throw new Error("HTTP " + response.status)
      const xml = await response.text()
      for (const block of blocks(xml).slice(0, 25)) {
        const title = itemValue(block, ["title"])
        const link = itemLink(block)
        if (!title || !link) continue
        const publishedRaw = itemValue(block, ["pubDate","published","updated","date"])
        const publishedAt = publishedRaw ? new Date(publishedRaw).toISOString() : null
        const summary = itemValue(block, ["description","summary","content"])
        const imageUrl = itemImage(block)
        const { data: existing } = await db.from("newsroom_stories").select("id").eq("canonical_url", link).maybeSingle()
        if (existing) continue
        const { error: insertError } = await db.from("newsroom_stories").insert({
          title, source_id: source.id, source_name: source.name, source_url: source.url,
          canonical_url: link, author: itemValue(block, ["author","dc:creator"]),
          published_at: publishedAt, summary, image_url: imageUrl
        })
        if (!insertError) detected++
      }
      await db.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", source.id)
    } catch (error) {
      await db.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: error instanceof Error ? error.message : "Fetch failed" }).eq("id", source.id)
    }
  }
  return NextResponse.json({ ok: true, detected, checked })
}