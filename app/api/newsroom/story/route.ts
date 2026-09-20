import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Story id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data: story, error } = await db.from("newsroom_stories").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  const { data: related } = await db.from("newsroom_stories").select("id,title,source_name,source_url,canonical_url,status,confidence,published_at,detected_at,summary").neq("id", id).ilike("title", "%" + story.title.split(" ").slice(0,4).join(" ") + "%").limit(8)
  return NextResponse.json({ story, related: related ?? [] })
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const body = await request.json()
  const id = String(body.id || "")
  if (!id) return NextResponse.json({ error: "Story id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data: current, error: currentError } = await db.from("newsroom_stories").select("id,status,confidence,ai_draft,verification_notes").eq("id", id).single()
  if (currentError || !current) return NextResponse.json({ error: currentError?.message || "Story not found" }, { status: 404 })
  const requested = body.status ? String(body.status) : current.status
  const allowed = new Set(["new","verifying","draft","review","held","approved","rejected","published"])
  if (!allowed.has(requested)) return NextResponse.json({ error: "Invalid newsroom status" }, { status: 400 })
  if (requested === "review" && !String(body.aiDraft ?? current.ai_draft ?? "").trim()) return NextResponse.json({ error: "An AI/editorial draft is required before review" }, { status: 400 })
  if (requested === "approved") {
    if (current.status !== "review") return NextResponse.json({ error: "Only stories in review can be approved" }, { status: 409 })
    if (!String(body.aiDraft ?? current.ai_draft ?? "").trim()) return NextResponse.json({ error: "A draft is required before approval" }, { status: 400 })
    if ((body.confidence ?? current.confidence) === "unverified") return NextResponse.json({ error: "Story remains unverified; cross-check it before approval" }, { status: 409 })
  }
  const { data, error } = await db.from("newsroom_stories").update({
    verification_notes: body.verificationNotes ?? current.verification_notes ?? null,
    ai_draft: body.aiDraft ?? current.ai_draft ?? null,
    status: requested,
    confidence: body.confidence ?? undefined,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data })
}