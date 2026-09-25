import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const params = new URL(request.url).searchParams
  const status = params.get("status")
  const db = createAdminClient()
  let query = db.from("newsroom_articles")
    .select("id,story_id,title,slug,dek,category,tags,featured_image_url,editorial_notes,live_summary,live_watchpoints,website_status,website_url,website_published_at,social_status,social_x,social_facebook,social_tiktok,updated_at")
    .order("updated_at", { ascending: false }).limit(100)
  if (status && status !== "all") query = query.eq("website_status", status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data ?? [] })
}
