import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isEditor(email?: string | null) {
  return Boolean(email && (process.env.NEWSROOM_EDITOR_EMAILS || process.env.LIVE_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isEditor(user?.email)) return NextResponse.json({ error: "Not authorised." }, { status: 403 })
  const form = await request.formData()
  const name = String(form.get("name") || "").trim()
  const url = String(form.get("url") || "").trim()
  const feedUrl = String(form.get("feed_url") || "").trim() || null
  if (!name || !url) return NextResponse.json({ error: "Name and URL are required." }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("newsroom_sources").upsert({ name, url, feed_url: feedUrl, source_type: feedUrl ? "rss" : "website" }, { onConflict: "url" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.redirect(new URL("/newsroom", request.url), 303)
}
