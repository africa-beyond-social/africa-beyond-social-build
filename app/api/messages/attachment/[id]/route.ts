import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 })
  const { id } = await params
  const { data: attachment } = await supabase
    .from("message_attachments")
    .select("id,message_id,storage_path,file_name,mime_type,file_size")
    .eq("id", id)
    .maybeSingle()
  if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
  const { data: message } = await supabase.from("messages").select("sender_id,recipient_id").eq("id", attachment.message_id).maybeSingle()
  if (!message || (message.sender_id !== user.id && message.recipient_id !== user.id)) return NextResponse.json({ error: "Not allowed." }, { status: 403 })
  const { data, error } = await supabase.storage.from("wigod-messages").createSignedUrl(attachment.storage_path, 300)
  if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message || "Could not create secure file URL." }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl, fileName: attachment.file_name, mimeType: attachment.mime_type })
}
