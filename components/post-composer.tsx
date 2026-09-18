"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { ImagePlus, Video, X } from "lucide-react"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280
const MAX_VIDEO_SIZE = 50 * 1024 * 1024

export function PostComposer({ profile, onPosted, autoFocus = false, placeholder = "What's happening across Africa and beyond?" }: {
  profile: Profile | null
  onPosted?: () => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const nearLimit = remaining <= 20
  const canPost = (content.trim().length > 0 || imageFile !== null || videoFile !== null) && !over && !loading

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 320) + "px"
  }

  async function uploadMedia(file: File) {
    const supabase = createClient()
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin"
    const path = (profile?.id ?? "user") + "/" + crypto.randomUUID() + "." + extension
    const { error } = await supabase.storage.from("post-media").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    })
    if (error) throw new Error(error.message)
    return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl
  }

  async function submit() {
    if (!canPost) return
    setLoading(true)
    try {
      const imageUrl = imageFile ? await uploadMedia(imageFile) : null
      const videoUrl = videoFile ? await uploadMedia(videoFile) : null
      const result = await createPost(content, imageUrl, videoUrl)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setContent("")
      setImageFile(null)
      setImagePreview(null)
      setVideoFile(null)
      setVideoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (videoInputRef.current) videoInputRef.current.value = ""
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      router.refresh()
      toast.success("Your post is live.")
      onPosted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Media upload failed.")
    } finally {
      setLoading(false)
    }
  }

  function chooseImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.")
    if (file.size > 10 * 1024 * 1024) return toast.error("Images must be 10 MB or smaller.")
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setVideoFile(null)
    setVideoPreview(null)
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  function chooseVideo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("video/")) return toast.error("Please choose a video file.")
    if (file.size > MAX_VIDEO_SIZE) return toast.error("Videos must be 50 MB or smaller.")
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
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
        {imagePreview && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/30">
            <img src={imagePreview} alt="Selected image preview" className="max-h-80 w-full object-contain" />
            <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = "" }} className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-sm" aria-label="Remove selected image"><X className="size-4" /></button>
          </div>
        )}
        {videoPreview && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
            <video src={videoPreview} controls playsInline className="max-h-96 w-full" />
            <button type="button" onClick={() => { setVideoFile(null); setVideoPreview(null); if (videoInputRef.current) videoInputRef.current.value = "" }} className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-sm" aria-label="Remove selected video"><X className="size-4" /></button>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => chooseImage(e.target.files?.[0])} />
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || videoFile !== null} aria-label="Add photo"><ImagePlus className="size-5" /><span className="sr-only">Add photo</span></Button>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])} />
            <Button type="button" variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} disabled={loading || imageFile !== null} aria-label="Add video"><Video className="size-5" /><span className="sr-only">Add video</span></Button>
          </div>
          <span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : nearLimit ? "text-brand-red" : "text-muted-foreground")} aria-live="polite">{remaining}</span>
          <Button onClick={submit} disabled={!canPost} size="lg" className="rounded-full px-6">{loading ? "Posting…" : "Post"}</Button>
        </div>
      </div>
    </div>
  )
}
