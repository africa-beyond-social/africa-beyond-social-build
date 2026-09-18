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
  const title = String(b.title || "").trim()
  const startAt = String(b.startAt || "").trim()
  if (!title || !startAt) return NextResponse.json({ error: "Title and start time are required" }, { status: 400 })
  const { data, error } = await createAdminClient().from("live_events").insert({
    title, description: b.description ? String(b.description).trim() : null,
    location: b.location ? String(b.location).trim() : null, start_at: startAt,
    end_at: b.endAt ? String(b.endAt).trim() : null, status: "scheduled",
    provider: "youtube", video_id: b.videoId ? String(b.videoId).trim() : null,
    stream_url: b.streamUrl ? String(b.streamUrl).trim() : null,
    thumbnail_url: b.thumbnailUrl ? String(b.thumbnailUrl).trim() : null, category: b.category || "community"
  }).select("id,title,description,location,start_at,end_at,status,provider,video_id,stream_url,thumbnail_url,category,created_at,updated_at").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}
export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Event id is required" }, { status: 400 })
  const { error } = await createAdminClient().from("live_events").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}