import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase()))
}
function words(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter(w => w.length > 3))
}
function similarity(a: string, b: string) {
  const A = words(a), B = words(b)
  if (!A.size || !B.size) return 0
  let common = 0; for (const w of A) if (B.has(w)) common++
  return common / Math.max(1, Math.min(A.size, B.size))
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not authorised" }, { status: 403 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Story id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data: story, error } = await db.from("newsroom_stories").select("*").eq("id", id).single()
  if (error || !story) return NextResponse.json({ error: error?.message || "Story not found" }, { status: 404 })
  const { data: candidates } = await db.from("newsroom_stories").select("id,title,source_name,source_url,canonical_url,published_at,summary,content_text").neq("id", id).order("detected_at", { ascending: false }).limit(200)
  const matches = (candidates || []).filter((c: any) => similarity(story.title, c.title) >= 0.55).slice(0, 12)
  const evidence = []
  for (const c of matches) {
    const relation = similarity(story.title, c.title) >= 0.75 ? "supporting" : "unclear"
    const row = { story_id:id, related_story_id:c.id, source_name:c.source_name || "Unknown source", source_url:c.canonical_url || c.source_url, title:c.title, published_at:c.published_at, summary:c.summary, content_text:c.content_text, relation }
    const { data } = await db.from("newsroom_evidence").upsert(row, { onConflict:"story_id,source_url" }).select("*").single()
    if (data) evidence.push(data)
  }
  const sourceCount = new Set(evidence.map((e:any) => e.source_name)).size + 1
  const notes = evidence.length
    ? `Automated cross-check found ${evidence.length} related report(s) from ${sourceCount} source(s). Similarity is based on headline text only; this is not proof that the underlying claim is true. Editorial verification remains required.`
    : "No sufficiently similar independent report was detected. Treat the story as unverified."
  await db.from("newsroom_stories").update({ verification_notes: notes, confidence: evidence.length ? "developing" : "unverified", status: "verifying", updated_at:new Date().toISOString() }).eq("id", id)
  return NextResponse.json({ ok:true, storyId:id, evidence, sourceCount, notes })
}
