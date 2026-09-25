"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createReply } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Paperclip, X } from "lucide-react"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280

export function ReplyComposer({ postId, profile }: { postId: string; profile: Profile | null }) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canReply = (content.trim().length > 0 || !!file) && !over && !loading

  async function submit() {
    if (!canReply) return
    setLoading(true)
    let attachment: { url: string; type: string; name?: string } | undefined
    if (file) {
      const supabase = createClient()
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
      const path = (profile?.id ?? "user") + "/" + crypto.randomUUID() + "." + ext
      const uploaded = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })
      if (uploaded.error) { setLoading(false); toast.error(uploaded.error.message); return }
      attachment = { url: supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl, type: file.type, name: file.name }
    }
    const res = await createReply(postId, content, attachment)
    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setContent("")
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ""
    router.refresh()
    toast.success("Reply posted.")
  }

  return (
    <div className="flex gap-3 border-b border-border px-4 py-3">
      <UserAvatar
        displayName={profile?.display_name ?? null}
        username={profile?.username ?? "you"}
        avatarUrl={profile?.avatar_url ?? null}
        className="size-9 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder="Post your reply"
          aria-label="Reply content"
          className="w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2"><input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={(e) => { const selected=e.target.files?.[0]; if(!selected)return; if(selected.size>50*1024*1024){toast.error("Files must be 50 MB or smaller.");return}; setFile(selected); setPreview(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null) }} /><Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={loading} aria-label="Add files"><Paperclip className="size-5" /><span className="sr-only">Add files</span></Button>{file && <span className="max-w-[180px] truncate text-xs text-muted-foreground">{file.name}</span>}{file && <button type="button" onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = "" }} aria-label="Remove attachment"><X className="size-4" /></button>}</div><div className="flex items-center justify-between">
          <span className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            {remaining}
          </span>
          <Button onClick={submit} disabled={!canReply} className="rounded-full px-5">
            {loading ? "Replying…" : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
