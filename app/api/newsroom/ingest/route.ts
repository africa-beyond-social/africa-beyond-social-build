import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const maxDuration = 25

const SOURCE_TIMEOUT_MS = 5000
const SOURCE_BATCH_SIZE = 4
const MAX_ITEMS_PER_SOURCE = 15
const LOOKBACK_MS = 48 * 60 * 60 * 1000

function strip(value: string) {
  return value.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function firstTag(block: string, tag: string) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"))
  return m ? strip(m[1]) : ""
}

function itemValue(block: string, tags: string[]) {
  for (const tag of tags) {
    const value = firstTag(block, tag)
    if (value) return value
  }
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

function blocks(xml: string) {
  const rss = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const atom = xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
  return [...rss, ...atom]
}

function parseDate(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { controller, clear: () => clearTimeout(timer) }
}

async function auth(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  const user = await getSessionUser()
  const admins = (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean)
  return Boolean(user?.email && admins.includes(user.email.toLowerCase()))
}

export async function GET(request: Request) {
  if (!(await auth(request))) return NextResponse.json({ error: "Not authorised" }, { status: 401 })

  const db = createAdminClient()
  const { data: sources, error } = await db
    .from("news_sources")
    .select("*")
    .eq("active", true)
    .in("source_type", ["rss", "google_news"])
    .eq("monitoring_enabled", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(SOURCE_BATCH_SIZE)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const cutoff = now - LOOKBACK_MS

  // Process only the least-recently checked sources on each run. This keeps the cron
  // invocation safely below the platform runtime ceiling while rotating through the
  // complete source list over successive five-minute runs.
  const results = await Promise.allSettled((sources ?? []).map(async (source) => {
    const checkedAt = new Date().toISOString()
    const timer = withTimeout(SOURCE_TIMEOUT_MS)

    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "WIGOD-Newsroom/1.0" },
        cache: "no-store",
        signal: timer.controller.signal,
      })
      if (!response.ok) throw new Error("HTTP " + response.status)

      const xml = await response.text()
      const rows = blocks(xml)
        .slice(0, MAX_ITEMS_PER_SOURCE)
        .map((block) => {
          const title = itemValue(block, ["title"])
          const link = itemLink(block)
          const publishedRaw = itemValue(block, ["pubDate", "published", "updated", "date"])
          return {
            title,
            link,
            publishedRaw,
            publishedAt: parseDate(publishedRaw),
            summary: itemValue(block, ["description", "summary", "content"]),
            imageUrl: itemImage(block),
            author: itemValue(block, ["author", "dc:creator"]),
          }
        })
        .filter((item) => {
          if (!item.title || !item.link) return false
          if (!item.publishedAt) return true
          return new Date(item.publishedAt).getTime() >= cutoff
        })

      const payload = rows.map((item) => ({
        title: item.title,
        source_id: source.id,
        source_name: source.name,
        source_url: source.url,
        canonical_url: item.link,
        author: item.author,
        published_at: item.publishedAt,
        summary: item.summary,
        image_url: item.imageUrl,
      }))

      let detected = 0
      if (payload.length) {
        const { data: inserted, error: insertError } = await db
          .from("newsroom_stories")
          .upsert(payload, { onConflict: "canonical_url", ignoreDuplicates: true })
          .select("id")

        if (insertError) throw new Error("Story insert failed: " + insertError.message)
        detected = inserted?.length ?? 0
      }

      await db
        .from("news_sources")
        .update({ last_checked_at: checkedAt, last_error: null })
        .eq("id", source.id)

      return {
        sourceId: source.id,
        source: source.name,
        ok: true,
        detected,
        checkedAt,
      }
    } catch (error) {
      const message = error instanceof Error
        ? (error.name === "AbortError" ? `Timed out after ${SOURCE_TIMEOUT_MS / 1000}s` : error.message)
        : "Fetch failed"

      await db
        .from("news_sources")
        .update({ last_checked_at: checkedAt, last_error: message })
        .eq("id", source.id)

      return {
        sourceId: source.id,
        source: source.name,
        ok: false,
        detected: 0,
        checkedAt,
        error: message,
      }
    } finally {
      timer.clear()
    }
  }))

  const sourceResults = results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { ok: false, detected: 0, error: "Source task failed unexpectedly" }
  )

  const detected = sourceResults.reduce((sum, result) => sum + Number(result.detected || 0), 0)
  const failed = sourceResults.filter((result) => !result.ok).length

  return NextResponse.json({
    ok: failed === 0,
    detected,
    checked: sourceResults.length,
    failed,
    durationProtection: {
      perSourceTimeoutSeconds: SOURCE_TIMEOUT_MS / 1000,
      sourceBatchSize: SOURCE_BATCH_SIZE,
      maxItemsPerSource: MAX_ITEMS_PER_SOURCE,
      lookbackHours: 48,
    },
    sources: sourceResults,
  })
}

// Phase 1 deployment trigger: keep source ingestion fixes on the production deployment path.
// Force Vercel to pick up the corrected main-branch ingestion implementation.
