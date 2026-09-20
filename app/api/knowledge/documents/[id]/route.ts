import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

export const runtime = "nodejs"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { data: document, error: lookupError } = await db
    .from("knowledge_documents")
    .select("id,storage_path,uploaded_by")
    .eq("id", id)
    .eq("uploaded_by", user.id)
    .maybeSingle()

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: "Knowledge document not found." }, { status: 404 })

  const { error: chunkError } = await db.from("knowledge_chunks").delete().eq("document_id", id)
  if (chunkError) return NextResponse.json({ error: chunkError.message }, { status: 500 })

  const { error: documentError } = await db
    .from("knowledge_documents")
    .delete()
    .eq("id", id)
    .eq("uploaded_by", user.id)

  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 })

  if (document.storage_path) {
    const { error: storageError } = await db.storage.from("wigod-knowledge").remove([document.storage_path])
    if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
