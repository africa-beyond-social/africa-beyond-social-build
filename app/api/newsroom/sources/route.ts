import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export async function GET() {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const { data, error } = await createAdminClient().from("news_sources").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sources: data ?? [] })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const body = await request.json()
  const name = String(body.name || "").trim()
  const url = String(body.url || "").trim()
  const sourceType = String(body.sourceType || "rss").trim()
  if (!name || !url) return NextResponse.json({ error: "Name and URL are required" }, { status: 400 })
  if (!["rss","website","x","facebook","google_news"].includes(sourceType)) return NextResponse.json({ error: "Invalid source type" }, { status: 400 })
  try { new URL(url) } catch { return NextResponse.json({ error: "A valid URL is required" }, { status: 400 }) }
  const { data, error } = await createAdminClient().from("news_sources").insert({ name, url, source_type: sourceType, created_by: user!.id }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Source id is required" }, { status: 400 })
  const { error } = await createAdminClient().from("news_sources").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}