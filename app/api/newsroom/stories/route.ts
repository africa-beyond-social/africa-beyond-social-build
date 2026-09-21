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
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  let query = createAdminClient().from("newsroom_stories").select("*").gte("published_at", cutoff).order("published_at", { ascending: false }).limit(100)
  if (status && status !== "all") query = query.eq("status", status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stories: data ?? [], windowHours: 48, cutoff })
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const body = await request.json()
  const id = String(body.id || "")
  const allowed = ["new","verifying","draft","review","held","approved","rejected","published"]
  if (!id || !allowed.includes(String(body.status))) return NextResponse.json({ error: "Story id and valid status are required" }, { status: 400 })
  const { data, error } = await createAdminClient().from("newsroom_stories").update({
    status: body.status,
    confidence: body.confidence || undefined,
    verification_notes: body.verificationNotes ?? undefined,
    ai_draft: body.aiDraft ?? undefined,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data })
}