"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { Paperclip, X } from "lucide-react"
import type { Profile } from "@/lib/types"

const MAX_LEN = 1500
const MAX_FILE_SIZE = 50 * 1024 * 1024

export function PostComposer({ profile, onPosted, autoFocus = false, placeholder = "What's happening across Africa and beyond?" }: {
  profile: Profile | null
  onPosted?: () => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canPost = (content.trim().length > 0 || !!file) && !over && !loading

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 320) + "px"
  }

  function chooseFile(next: File | undefined) {
    if (!next) return
    if (next.size > MAX_FILE_SIZE) return toast.error("Files must be 50 MB or smaller.")
    if (next.type.startsWith("image/") && next.size > 10 * 1024 * 1024) return toast.error("Images must be 10 MB or smaller.")
    setFile(next)
    setPreview(next.type.startsWith("image/") || next.type.startsWith("video/") ? URL.createObjectURL(next) : null)
  }

  async function uploadMedia(next: File) {
    const supabase = (await import("@/lib/supabase/client")).createClient()
    const extension = next.name.split(".").pop()?.toLowerCase() || "bin"
    const path = (profile?.id ?? "user") + "/" + crypto.randomUUID() + "." + extension
    const { error } = await supabase.storage.from("post-media").upload(path, next, {
      cacheControl: "3600", upsert: false, contentType: next.type,
    })
    if (error) throw new Error(error.message)
    return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl
  }

  async function submit() {
    if (!canPost) return
    setLoading(true)
    try {
      const attachment = file ? { url: await uploadMedia(file), type: file.type || "application/octet-stream", name: file.name } : undefined
      const imageUrl = file?.type.startsWith("image/") ? attachment?.url : null
      const videoUrl = file?.type.startsWith("video/") ? attachment?.url : null
      const result = await createPost(content, imageUrl, videoUrl, attachment)
      if (!result.ok) { toast.error(result.error); return }
      setContent("")
      setFile(null)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      router.refresh()
      toast.success("Your post is live.")
      onPosted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File upload failed.")
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex gap-3">
      <UserAvatar displayName={profile?.display_name ?? null} username={profile?.username ?? "you"} avatarUrl={profile?.avatar_url ?? null} size="lg" className="size-10 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea ref={textareaRef} value={content} autoFocus={autoFocus} onChange={(e) => { setContent(e.target.value); autoGrow() }} onKeyDown={onKeyDown} rows={2} placeholder={placeholder} className="w-full resize-none bg-transparent text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground" aria-label="Post content" />
        {file && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/20">
            {file.type.startsWith("image/") && preview ? <img src={preview} alt="Selected image preview" className="max-h-80 w-full object-contain" /> :
             file.type.startsWith("video/") && preview ? <video src={preview} controls playsInline className="max-h-96 w-full" /> :
             file.type.startsWith("audio/") ? <audio controls src={URL.createObjectURL(file)} className="w-full p-3" /> :
             <div className="flex items-center gap-3 p-4 text-sm"><Paperclip className="size-5 text-brand-green" /><span className="truncate">{file.name}</span></div>}
            <button type="button" onClick={() => { setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = "" }} className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-sm" aria-label="Remove selected file"><X className="size-4" /></button>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading} aria-label="Add files"><Paperclip className="size-5" /><span className="sr-only">Add files</span></Button>
          </div>
          <span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : remaining <= 20 ? "text-brand-red" : "text-muted-foreground")} aria-live="polite">{remaining}</span>
          <Button onClick={submit} disabled={!canPost} size="lg" className="rounded-full px-6">{loading ? "Posting…" : "Post"}</Button>
        </div>
      </div>
    </div>
  )
}
