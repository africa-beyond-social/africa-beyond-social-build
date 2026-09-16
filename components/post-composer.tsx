"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPost } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280

export function PostComposer({
  profile,
  onPosted,
  autoFocus = false,
  placeholder = "What's happening across Africa and beyond?",
}: {
  profile: Profile | null
  onPosted?: () => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const nearLimit = remaining <= 20
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
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setContent("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    router.refresh()
    toast.success("Your post is live.")
    onPosted?.()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex gap-3">
      <UserAvatar
        displayName={profile?.display_name ?? null}
        username={profile?.username ?? "you"}
        avatarUrl={profile?.avatar_url ?? null}
        size="lg"
        className="size-10 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea
          ref={textareaRef}
          value={content}
          autoFocus={autoFocus}
          onChange={(e) => {
            setContent(e.target.value)
            autoGrow()
          }}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Post content"
        />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span
            className={cn(
              "text-xs tabular-nums",
              over ? "font-semibold text-destructive" : nearLimit ? "text-brand-red" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {remaining}
          </span>
          <Button onClick={submit} disabled={!canPost} size="lg" className="rounded-full px-6">
            {loading ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
    </div>
  )
}
