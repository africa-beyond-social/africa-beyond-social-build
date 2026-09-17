"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, ImagePlus, Loader2, Video, X } from "lucide-react"
import { createPost } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280
const MAX_FILE_SIZE = 25 * 1024 * 1024
const ACCEPT = "image/*,video/*,application/pdf"
type Attachment = { url: string; type: string; name: string; size: number }

export function PostComposer({ profile, onPosted, autoFocus = false, placeholder = "What's happening across Africa and beyond?" }: { profile: Profile | null; onPosted?: () => void; autoFocus?: boolean; placeholder?: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState("")
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canPost = Boolean((content.trim() || attachment) && !over && !loading && !uploading)

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) { toast.error("Attachments must be 25 MB or smaller."); return }
    const allowed = file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "application/pdf"
    if (!allowed) { toast.error("Only photos, videos and PDF files can be attached."); return }
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("Sign in to attach media."); return }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type, upsert: false })
      if (error) { toast.error(error.message); return }
      const { data } = supabase.storage.from("post-media").getPublicUrl(path)
      setAttachment({ url: data.publicUrl, type: file.type, name: file.name, size: file.size })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function submit() {
    if (!canPost) return
    setLoading(true)
    const result = await createPost(content, attachment)
    setLoading(false)
    if (!result.ok) { toast.error(result.error); return }
    setContent("")
    setAttachment(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    router.refresh()
    toast.success("Your post is live.")
    onPosted?.()
  }

  return (
    <div className="flex gap-3">
      <UserAvatar displayName={profile?.display_name ?? null} username={profile?.username ?? "you"} avatarUrl={profile?.avatar_url ?? null} size="lg" className="size-10 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea ref={textareaRef} value={content} autoFocus={autoFocus} onChange={(e) => { setContent(e.target.value); autoGrow() }} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit() } }} rows={2} placeholder={placeholder} className="w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted-foreground" aria-label="Post content" />
        {attachment && <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/20">
          {attachment.type.startsWith("image/") && <img src={attachment.url} alt={attachment.name} className="max-h-80 w-full object-contain" />}
          {attachment.type.startsWith("video/") && <video src={attachment.url} controls playsInline className="max-h-80 w-full bg-black" />}
          {attachment.type === "application/pdf" && <div className="flex items-center gap-3 p-4"><span className="flex size-11 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red"><FileText className="size-6" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{attachment.name}</p><p className="text-xs text-muted-foreground">PDF document</p></div></div>}
          <button type="button" onClick={() => setAttachment(null)} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label="Remove attachment"><X className="size-4" /></button>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file) }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || loading} className="rounded-full p-2 text-brand-green hover:bg-brand-green/10 disabled:opacity-50" aria-label="Add photo, video or PDF"><ImagePlus className="size-5" /></button>
            <span className="text-[11px] text-muted-foreground">{uploading ? <><Loader2 className="mr-1 inline size-3.5 animate-spin" />Uploading…</> : <><Video className="mr-1 inline size-3.5" />Photo · Video · PDF · 25 MB max</>}</span>
          </div>
          <div className="flex items-center gap-3"><span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : remaining <= 20 ? "text-brand-red" : "text-muted-foreground")}>{remaining}</span><Button onClick={submit} disabled={!canPost} size="lg" className="rounded-full px-6">{loading ? "Posting…" : "Post"}</Button></div>
        </div>
      </div>
    </div>
  )
}
