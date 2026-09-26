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
  const { data: current, error: currentError } = await db.from("newsroom_stories").select("id,status,confidence,ai_draft,verification_notes,evidence_basis,unsupported_claims,current_role_status").eq("id", id).single()
  if (currentError || !current) return NextResponse.json({ error: currentError?.message || "Story not found" }, { status: 404 })
  const requested = body.status ? String(body.status) : current.status
  const allowed = new Set(["new","verifying","draft","review","held","approved","rejected","published"])
  if (!allowed.has(requested)) return NextResponse.json({ error: "Invalid newsroom status" }, { status: 400 })
  if (requested === "review" && !String(body.aiDraft ?? current.ai_draft ?? "").trim()) return NextResponse.json({ error: "An AI/editorial draft is required before review" }, { status: 400 })
  if (body.humanVerified === true) {
    if (!["review","verifying"].includes(current.status)) return NextResponse.json({ error: "Only stories in editorial review can be human-verified" }, { status: 409 })
    if (!String(body.aiDraft ?? current.ai_draft ?? "").trim()) return NextResponse.json({ error: "A draft is required before human verification" }, { status: 400 })
    const verificationNote = String(body.verificationNotes ?? current.verification_notes ?? "").trim()
    if (verificationNote.length < 40) return NextResponse.json({ error: "Record at least 40 characters explaining what the editor verified and what evidence was checked" }, { status: 400 })
    if (Array.isArray(current.unsupported_claims) && current.unsupported_claims.length > 0) return NextResponse.json({ error: "Resolve unsupported claims before human verification" }, { status: 409 })
  }
  if (requested === "approved") {
    if (current.status !== "review") return NextResponse.json({ error: "Only stories in editorial review can be approved" }, { status: 409 })
    if (!String(body.aiDraft ?? current.ai_draft ?? "").trim()) return NextResponse.json({ error: "A draft is required before approval" }, { status: 400 })
    const verificationNote = String(body.verificationNotes ?? current.verification_notes ?? "").trim()
    if (!body.humanVerified || verificationNote.length < 40) return NextResponse.json({ error: "Human editorial verification is required: record what you checked and why the story is publishable" }, { status: 400 })
    if (Array.isArray(current.unsupported_claims) && current.unsupported_claims.length > 0) return NextResponse.json({ error: "Resolve unsupported claims before approval" }, { status: 409 })
  }
  const humanVerified = body.humanVerified === true
  const { data, error } = await db.from("newsroom_stories").update({
    verification_notes: body.verificationNotes ?? current.verification_notes ?? null,
    ai_draft: body.aiDraft ?? current.ai_draft ?? null,
    status: requested,
    confidence: humanVerified ? "cross_checked" : (body.confidence ?? undefined),
    editorial_route: humanVerified ? "human_review" : undefined,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) { console.error("newsroom story update failed", { id, requested, humanVerified, error: error.message, details: error.details, hint: error.hint, code: error.code }); return NextResponse.json({ error: error.message || "Unable to save newsroom decision" }, { status: 500 }) }
  return NextResponse.json({ story: data })
}