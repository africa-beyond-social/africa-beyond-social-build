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

const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Cape Verde","Central African Republic",
  "Chad","Comoros","Congo","Cote d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia",
  "Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi",
  "Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome",
  "Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo",
  "Tunisia","Uganda","Zambia","Zimbabwe"
]

const ZIMBABWE_TERMS = [
  "zimbabwe","harare","bulawayo","mutare","gweru","masvingo","mwenezi","chiredzi","triangle","victoria falls",
  "marondera","kadoma","kwekwe","bindura","chinhoyi","kariba","plumtree","beira corridor","zanu-pf","zanupf",
  "mnangagwa","chiwenga","chamisa","parliament of zimbabwe","reserve bank of zimbabwe","rbz","zimra","zimbabwe republic police"
]

const SADC_TERMS = [
  "sadc","southern african development community","angola","botswana","comoros","democratic republic of congo",
  "eswatini","lesotho","madagascar","malawi","mauritius","mozambique","namibia","seychelles","south africa",
  "tanzania","zambia","zimbabwe"
]

function hasAny(text: string, terms: string[]) {
  const value = text.toLowerCase()
  return terms.some(term => value.includes(term.toLowerCase()))
}

function isRelevantItem(sourceName: string, title: string, summary: string) {
  const text = (title + " " + summary).toLowerCase()
  const name = sourceName.toLowerCase()

  if (name.includes("africanews") || name.includes("allafrica")) return true
  if (name.includes("world & africa")) return hasAny(text, ["africa","african", ...AFRICAN_COUNTRIES])
  if (name.includes("sadc")) return hasAny(text, SADC_TERMS)
  if (name.includes("zimbabwe") || name.includes("origins zimbabwe")) return hasAny(text, ZIMBABWE_TERMS)
  if (name.includes("community") || name.includes("health") || name.includes("education")) {
    return hasAny(text, ["zimbabwe","africa","african","health","hospital","clinic","education","school","university","community","ngo","humanitarian"])
  }
  if (name.includes("business") || name.includes("development")) {
    return hasAny(text, ["zimbabwe","africa","african","mining","agriculture","economy","business","trade","investment","development","manufacturing","finance"])
  }
  if (name.includes("culture")) {
    return hasAny(text, ["zimbabwe","africa","african","culture","arts","music","heritage","literature","film","theatre","museum"])
  }
  if (name.includes("sports")) {
    return hasAny(text, ["zimbabwe","africa","african","cricket","football","soccer","rugby","athletics","olympics","sport"])
  }
  if (name.includes("technology")) {
    return hasAny(text, ["zimbabwe","africa","african","technology","digital","innovation","ai","artificial intelligence","cyber","internet","telecom"])
  }
  if (name.includes("africa")) return hasAny(text, ["africa","african", ...AFRICAN_COUNTRIES])
  return true
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
  if ((request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")) return true
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
          if (!isRelevantItem(source.name, item.title, item.summary)) return false
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
// Production deployment trigger: corrected bounded ingestion is ready for the Pro deployment pipeline.
// Force Vercel to pick up the corrected main-branch ingestion implementation.
