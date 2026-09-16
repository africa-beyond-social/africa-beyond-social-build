"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { editPost } from "@/lib/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_LEN = 280

export function EditPostDialog({
  postId,
  initialContent,
  open,
  onOpenChange,
}: {
  postId: string
  initialContent: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [loading, setLoading] = useState(false)

  const remaining = MAX_LEN - content.length
  const over = remaining < 0
  const canSave = content.trim().length > 0 && !over && !loading && content !== initialContent

  async function save() {
    if (!canSave) return
    setLoading(true)
    const result = await editPost(postId, content)
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Post updated.")
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">Edit post</DialogTitle>
        </DialogHeader>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-[0.95rem] leading-relaxed outline-none focus-visible:border-ring"
          aria-label="Edit post content"
        />
        <DialogFooter>
          <span className={cn("mr-auto self-center text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
            {remaining}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
