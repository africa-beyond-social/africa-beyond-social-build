import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(
    email &&
      (process.env.LIVE_ADMIN_EMAILS || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(email.toLowerCase()),
  )
}

export async function GET() {
  const { data, error } = await createAdminClient()
    .from("live_events")
    .select("id,title,description,thumbnail_url,category,status,room_name,live_started_at,live_ended_at,start_at")
    .eq("status", "live")
    .order("live_started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ live: data ?? null })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const action = body.action === "stop" ? "stop" : "start"
  const admin = createAdminClient()

  if (action === "stop") {
    const room = String(body.room || "").trim()
    const query = admin.from("live_events").update({
      status: "completed",
      live_ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("status", "live")
    if (room) query.eq("room_name", room)
    const { data, error } = await query.select("id,title,room_name,status,live_started_at,live_ended_at").maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ live: data ?? null })
  }

  const title = String(body.title || "").trim()
  if (!title) return NextResponse.json({ error: "Broadcast title is required." }, { status: 400 })

  await admin.from("live_events").update({
    status: "completed",
    live_ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("status", "live")

  const room = "wigod-" + randomUUID()
  const now = new Date().toISOString()
  const { data, error } = await admin.from("live_events").insert({
    title,
    description: body.description ? String(body.description).trim() : null,
    thumbnail_url: body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null,
    category: body.category ? String(body.category).trim() : "community",
    status: "live",
    provider: "other",
    room_name: room,
    stream_url: room,
    start_at: now,
    live_started_at: now,
  }).select("id,title,description,thumbnail_url,category,status,room_name,live_started_at,live_ended_at,start_at").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ live: data }, { status: 201 })
}
