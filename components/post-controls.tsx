"use client"

import { useState } from "react"
import { Flag, MoreHorizontal, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { reportPost } from "@/lib/actions"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const reasons = ["spam","harassment","impersonation","hate","violence","sexual","scam","other"]

export function PostControls({ postId }: { postId: number }) {
  const [hidden, setHidden] = useState(false)
  async function report() {
    const choice = window.prompt("Report post:\n\n1. Spam\n2. Harassment\n3. Impersonation\n4. Hate\n5. Violence\n6. Sexual content\n7. Scam\n8. Other\n\nEnter a number:")
    if (!choice) return
    const reason = reasons[Number(choice) - 1]
    if (!reason) { toast.error("Please choose a valid report reason."); return }
    const details = window.prompt("Add details (optional):") ?? ""
    const res = await reportPost(postId, reason, details)
    if (!res.ok) toast.error(res.error)
    else toast.success("Report sent to WIGOD for review.")
  }
  if (hidden) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label="Post controls" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setHidden(true)}>
          <EyeOff className="size-4" /> Not interested
        </DropdownMenuItem>
        <DropdownMenuItem onClick={report}>
          <Flag className="size-4" /> Report post
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
