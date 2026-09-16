"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createReply } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

const MAX_LEN = 280

export function ReplyComposer({ postId, profile }: { postId: string; profile: Profile | null }) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canReply = content.trim().length > 0 && !over && !loading

  async function submit() {
    if (!canReply) return
    setLoading(true)
    const res = await createReply(postId, content)
    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setContent("")
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
        <div className="flex items-center justify-between">
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
