import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function ghostToken() {
  const key = process.env.GHOST_ADMIN_API_KEY || ""
  const [id, secret] = key.split(":")
  if (!id || !secret) throw new Error("GHOST_ADMIN_API_KEY must be id:secret")
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id })).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })).toString("base64url")
  const signing = header + "." + payload
  return signing + "." + crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(signing).digest("base64url")
}
function cleanHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
}
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const body = await request.json()
  const id = body.id
  const status = body.status === "draft" || body.status === "scheduled" ? "draft" : "published"
  if (!id) return NextResponse.json({ error: "Article id is required" }, { status: 400 })
  if (!process.env.GHOST_ADMIN_API_KEY || !process.env.GHOST_ADMIN_API_URL) return NextResponse.json({ error: "Ghost Admin API is not configured" }, { status: 500 })

  const db = createAdminClient()
  const { data: article, error } = await db.from("newsroom_articles").select("*").eq("id", id).single()
  if (error || !article) return NextResponse.json({ error: error?.message || "Article not found" }, { status: 404 })
  const { data: story } = await db.from("newsroom_stories").select("status,confidence").eq("id", article.story_id).single()
  if (!story || story.status !== "approved") return NextResponse.json({ error: "Only an approved newsroom story can be published to Africa & Beyond" }, { status: 409 })
  if (!String(article.body_html || "").trim()) return NextResponse.json({ error: "Article body is empty" }, { status: 400 })
  if (article.website_post_id) return NextResponse.json({ ok: true, alreadyPublished: true, url: article.website_url })

  const base = process.env.GHOST_ADMIN_API_URL.replace(/\/$/, "")
  const payload = { posts: [{ title: article.title, slug: article.slug || undefined, html: cleanHtml(article.body_html || ""),
    custom_excerpt: article.dek || undefined, meta_title: article.seo_title || undefined, meta_description: article.seo_description || undefined,
    status, feature_image: article.featured_image_url || undefined }] }
  const response = await fetch(base + "/ghost/api/admin/posts/?source=html", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Ghost " + ghostToken() }, body: JSON.stringify(payload)
  })
  const data = await response.json()
  if (!response.ok) {
    await db.from("newsroom_articles").update({ website_status: "failed", updated_at: new Date().toISOString() }).eq("id", id)
    return NextResponse.json({ error: data?.errors?.[0]?.message || "Website publishing failed" }, { status: 502 })
  }
  const post = data.posts?.[0]
  const websiteUrl = post?.url || ((process.env.GHOST_PUBLICATION_URL || "").replace(/\/$/, "") + "/" + article.slug)
  await db.from("newsroom_articles").update({
    website_status: status === "published" ? "published" : "scheduled", website_post_id: post?.id || null,
    website_url: websiteUrl, website_published_at: status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString()
  }).eq("id", id)
  await db.from("newsroom_stories").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", article.story_id)
  return NextResponse.json({ ok: true, postId: post?.id, url: websiteUrl })
}
