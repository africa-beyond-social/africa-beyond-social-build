import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim() || ""
  const db = createAdminClient()
  let query = db.from("knowledge_records").select("id,title,record_type,summary,verification_status,source_document_ids,node_id,created_at").eq("created_by", user.id).order("created_at", { ascending: false }).limit(100)
  if (q) query = query.or("title.ilike.%" + q + "%,summary.ilike.%" + q + "%")
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data || [] })
}