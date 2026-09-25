import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 50 * 1024 * 1024

function allowed(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/") || file.type.startsWith("audio/")
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 })

  const form = await req.formData()
  const recipientId = String(form.get("recipientId") || "")
  const file = form.get("file")
  if (!recipientId || !(file instanceof File)) return NextResponse.json({ error: "Recipient and file are required." }, { status: 400 })
  if (recipientId === user.id) return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 })
  if (!allowed(file)) return NextResponse.json({ error: "Only images, audio files and PDF documents can be shared here." }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be between 1 byte and 50 MB." }, { status: 400 })

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({ sender_id: user.id, recipient_id: recipientId, content: file.name, message_type: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "pdf" })
    .select("id")
    .single()
  if (messageError || !message) return NextResponse.json({ error: messageError?.message || "Could not create message." }, { status: 500 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "attachment"
  const path = message.id + "/" + crypto.randomUUID() + "-" + safeName
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from("wigod-messages").upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) {
    await supabase.from("messages").delete().eq("id", message.id).eq("sender_id", user.id)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from("message_attachments")
    .insert({ message_id: message.id, storage_path: path, file_name: file.name, mime_type: file.type || "application/octet-stream", file_size: file.size })
    .select("id,message_id,file_name,mime_type,file_size")
    .single()
  if (attachmentError || !attachment) {
    await supabase.storage.from("wigod-messages").remove([path])
    await supabase.from("messages").delete().eq("id", message.id).eq("sender_id", user.id)
    return NextResponse.json({ error: attachmentError?.message || "Could not save attachment." }, { status: 500 })
  }

  const { error: linkError } = await supabase.from("messages").update({ attachment_id: attachment.id }).eq("id", message.id).eq("sender_id", user.id)
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  return NextResponse.json({ ok: true, attachment })
}
