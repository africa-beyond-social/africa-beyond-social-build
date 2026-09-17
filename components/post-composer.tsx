"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImagePlus, Video, X } from "lucide-react"
import { createPost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280

export function PostComposer({ profile, onPosted, autoFocus = false, placeholder = "What's happening across Africa and beyond?" }: { profile: Profile | null; onPosted?: () => void; autoFocus?: boolean; placeholder?: string }) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canPost = content.trim().length > 0 && !over && !loading

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }

  async function submit() {
    if (!canPost) return
    setLoading(true)
    const result = await createPost(content)
    setLoading(false)
    if (!result.ok) { toast.error(result.error); return }
    setContent("")
    setMediaUrl("")
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
        {mediaUrl && <div className="relative overflow-hidden rounded-xl border border-border"><img src={mediaUrl} alt="Attached media preview" className="max-h-72 w-full object-cover" /><button type="button" onClick={() => setMediaUrl("")} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label="Remove media"><X className="size-4" /></button></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { const url = window.prompt("Paste an image or video URL"); if (url) setMediaUrl(url.trim()) }} className="rounded-full p-2 text-brand-green hover:bg-brand-green/10" aria-label="Add photo or video"><ImagePlus className="size-5" /></button>
            <span className="text-[11px] text-muted-foreground"><Video className="mr-1 inline size-3.5" />Media attachment preview</span>
          </div>
          <div className="flex items-center gap-3"><span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : remaining <= 20 ? "text-brand-red" : "text-muted-foreground")}>{remaining}</span><Button onClick={submit} disabled={!canPost} size="lg" className="rounded-full px-6">{loading ? "Posting…" : "Post"}</Button></div>
        </div>
      </div>
    </div>
  )
}
