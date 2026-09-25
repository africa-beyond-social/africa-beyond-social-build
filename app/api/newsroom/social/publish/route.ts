import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

function isCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.NEWSROOM_CRON_SECRET
  if (secret && request.headers.get("authorization") === "Bearer " + secret) return true
  return (request.headers.get("user-agent") || "").toLowerCase().includes("vercel-cron")
}

function env(name: string) {
  return String(process.env[name] || "").trim()
}

async function publishX(text: string) {
  const token = env("X_ACCESS_TOKEN")
  if (!token) throw new Error("X_ACCESS_TOKEN is not configured")
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify({ text }),
  })
  const raw = await response.text()
  if (!response.ok) throw new Error("X HTTP " + response.status + ": " + raw.slice(0, 500))
  const data = JSON.parse(raw)
  return data?.data?.id || null
}

async function publishFacebook(message: string, link: string) {
  const pageId = env("FACEBOOK_PAGE_ID")
  const token = env("FACEBOOK_PAGE_ACCESS_TOKEN")
  if (!pageId || !token) throw new Error("FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not configured")
  const version = env("FACEBOOK_GRAPH_VERSION") || "v23.0"
  const url = `https://graph.facebook.com/${version}/${pageId}/feed`
  const body = new URLSearchParams({ message, link, access_token: token })
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body })
  const raw = await response.text()
  if (!response.ok) throw new Error("Facebook HTTP " + response.status + ": " + raw.slice(0, 500))
  const data = JSON.parse(raw)
  return data?.id || null
}

async function publishTikTok(title: string, imageUrl: string) {
  const token = env("TIKTOK_ACCESS_TOKEN")
  if (!token) throw new Error("TIKTOK_ACCESS_TOKEN is not configured")
  if (!imageUrl) throw new Error("TikTok direct photo publishing requires a public featured image URL")
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 2200),
        description: title + " #AfricaAndBeyond #News",
        privacy_level: env("TIKTOK_PRIVACY_LEVEL") || "PUBLIC_TO_EVERYONE",
        disable_comment: false,
        auto_add_music: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [imageUrl],
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  })
  const raw = await response.text()
  if (!response.ok) throw new Error("TikTok HTTP " + response.status + ": " + raw.slice(0, 500))
  const data = JSON.parse(raw)
  if (data?.error?.code && data.error.code !== "ok") throw new Error("TikTok " + data.error.code + ": " + String(data.error.message || "publishing failed"))
  return data?.data?.publish_id || null
}

export async function GET(request: Request) {
  if (!isCron(request)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const db = createAdminClient()
  const { data: articles, error } = await db.from("newsroom_articles")
    .select("*")
    .eq("website_status", "published")
    .eq("social_status", "generated")
    .order("website_published_at", { ascending: true })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!articles?.length) return NextResponse.json({ ok: true, queued: 0, message: "No generated social posts waiting for distribution." })

  const configuredNetworks = [
    env("X_ACCESS_TOKEN") ? "x" : null,
    env("FACEBOOK_PAGE_ID") && env("FACEBOOK_PAGE_ACCESS_TOKEN") ? "facebook" : null,
    env("TIKTOK_ACCESS_TOKEN") ? "tiktok" : null,
  ].filter(Boolean) as string[]

  if (!configuredNetworks.length) {
    return NextResponse.json({
      ok: false,
      queued: articles.length,
      message: "Direct social publishing is built but no platform credentials are configured yet.",
      networks: { x: false, facebook: false, tiktok: false },
    }, { status: 503 })
  }

  let published = 0
  const results: any[] = []

  for (const article of articles) {
    const result: any = { id: article.id, networks: {} }
    try {
      if (env("X_ACCESS_TOKEN")) {
        try {
          result.networks.x = { ok: true, id: await publishX(String(article.social_x || "").trim()) }
        } catch (e) {
          result.networks.x = { ok: false, error: e instanceof Error ? e.message : "X publishing failed" }
        }
      }

      if (env("FACEBOOK_PAGE_ID") && env("FACEBOOK_PAGE_ACCESS_TOKEN")) {
        try {
          result.networks.facebook = {
            ok: true,
            id: await publishFacebook(
              String(article.social_facebook || article.title || "").replace("[ARTICLE LINK]", String(article.website_url || "")),
              String(article.website_url || "")
            ),
          }
        } catch (e) {
          result.networks.facebook = { ok: false, error: e instanceof Error ? e.message : "Facebook publishing failed" }
        }
      }

      if (env("TIKTOK_ACCESS_TOKEN")) {
        try {
          result.networks.tiktok = { ok: true, publishId: await publishTikTok(String(article.title || ""), String(article.featured_image_url || "")) }
        } catch (e) {
          result.networks.tiktok = { ok: false, error: e instanceof Error ? e.message : "TikTok publishing failed" }
        }
      }

      const attempted = Object.values(result.networks) as any[]
      const succeeded = attempted.filter(v => v.ok).length
      const failed = attempted.filter(v => !v.ok).length

      if (succeeded > 0 && failed === 0) {
        await db.from("newsroom_articles").update({ social_status: "published", updated_at: new Date().toISOString() }).eq("id", article.id)
        result.status = "published"
        published++
      } else if (succeeded > 0) {
        await db.from("newsroom_articles").update({
          social_status: "partial",
          editorial_notes: JSON.stringify(result.networks).slice(0, 4000),
          updated_at: new Date().toISOString(),
        }).eq("id", article.id)
        result.status = "partial"
      } else {
        await db.from("newsroom_articles").update({
          social_status: "failed",
          editorial_notes: JSON.stringify(result.networks).slice(0, 4000),
          updated_at: new Date().toISOString(),
        }).eq("id", article.id)
        result.status = "failed"
      }
    } catch (error) {
      result.status = "failed"
      result.error = error instanceof Error ? error.message : "Social publishing failed"
      await db.from("newsroom_articles").update({ social_status: "failed", editorial_notes: result.error, updated_at: new Date().toISOString() }).eq("id", article.id)
    }
    results.push(result)
  }

  return NextResponse.json({ ok: true, queued: articles.length, published, results })
}
