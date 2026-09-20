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
  const storyId = String(form.get("story_id") || "").trim()
  if (!storyId) return NextResponse.json({ error: "Story ID is required." }, { status: 400 })

  const admin = createAdminClient()
  const verificationState = String(form.get("verification_state") || "reported")
  const status = String(form.get("status") || "incoming")
  const allowedVerification = ["confirmed","reported","unconfirmed","conflicting"]
  const allowedStatus = ["incoming","verifying","ready_for_editor","published","held","rejected"]
  if (!allowedVerification.includes(verificationState) || !allowedStatus.includes(status)) return NextResponse.json({ error: "Invalid newsroom state." }, { status: 400 })

  const { data: existing } = await admin.from("newsroom_drafts").select("id").eq("story_id", storyId).maybeSingle()
  const draft = {
    story_id: storyId,
    headline: String(form.get("headline") || "").trim() || null,
    lead: String(form.get("lead") || "").trim() || null,
    body: String(form.get("body") || "").trim() || null,
    background: String(form.get("background") || "").trim() || null,
    editor_notes: String(form.get("editor_notes") || "").trim() || null,
  }
  const draftResult = existing
    ? await admin.from("newsroom_drafts").update(draft).eq("id", existing.id)
    : await admin.from("newsroom_drafts").insert(draft)
  if (draftResult.error) return NextResponse.json({ error: draftResult.error.message }, { status: 500 })

  const storyResult = await admin.from("newsroom_stories").update({ headline: draft.headline || "Untitled story", verification_state: verificationState, status }).eq("id", storyId)
  if (storyResult.error) return NextResponse.json({ error: storyResult.error.message }, { status: 500 })

  return NextResponse.redirect(new URL("/newsroom/" + storyId, request.url), 303)
}
