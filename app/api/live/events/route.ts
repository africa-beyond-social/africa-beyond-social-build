import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isLiveAdmin(email?: string | null) {
  if (!email) return false
  const allowed = (process.env.LIVE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isLiveAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })

  const body = await request.json()
  const title = String(body.title || "").trim()
  const startAt = String(body.startAt || "").trim()
  if (!title || !startAt) return NextResponse.json({ error: "Title and start time are required" }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("live_events")
    .insert({
      title,
      description: body.description ? String(body.description).trim() : null,
      location: body.location ? String(body.location).trim() : null,
      start_at: startAt,
      end_at: body.endAt ? String(body.endAt).trim() : null,
      status: body.status || "scheduled",
      provider: body.provider || "youtube",
      video_id: body.videoId ? String(body.videoId).trim() : null,
      stream_url: body.streamUrl ? String(body.streamUrl).trim() : null,
      thumbnail_url: body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null,
      category: body.category || "community",
    })
    .select("id, title, description, location, start_at, end_at, status, provider, video_id, stream_url, thumbnail_url, category, created_at, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!isLiveAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })

  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Event id is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from("live_events").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
