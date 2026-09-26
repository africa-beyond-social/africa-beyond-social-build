"use client"

import { useEffect, useState, useTransition } from "react"
import { Ban, BellOff, Flag, MoreHorizontal, VolumeX } from "lucide-react"
import { toast } from "sonner"
import { getSafetyState, reportUser, toggleBlock, toggleMute } from "@/lib/actions"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const reasons = [
  ["spam", "Spam or unwanted content"],
  ["harassment", "Harassment or abuse"],
  ["impersonation", "Impersonation"],
  ["hate", "Hateful content"],
  ["violence", "Violence or threats"],
  ["sexual", "Sexual content"],
  ["scam", "Scam or fraud"],
  ["other", "Something else"],
] as const

export function AccountControls({ targetUserId }: { targetUserId: string }) {
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    getSafetyState(targetUserId).then((state) => { setMuted(state.muted); setBlocked(state.blocked) })
  }, [targetUserId])

  function doMute() {
    const next = !muted
    setMuted(next)
    startTransition(async () => {
      const res = await toggleMute(targetUserId)
      if (!res.ok) { setMuted(!next); toast.error(res.error) }
      else toast.success(next ? "Muted. Their posts will no longer appear in your discovery feeds." : "Unmuted.")
    })
  }

  function doBlock() {
    const next = !blocked
    setBlocked(next)
    startTransition(async () => {
      const res = await toggleBlock(targetUserId)
      if (!res.ok) { setBlocked(!next); toast.error(res.error) }
      else toast.success(next ? "Blocked. You and this account are no longer connected." : "Unblocked.")
    })
  }

  async function doReport() {
    const choice = window.prompt("Report this account:\n\n" + reasons.map((r, i) => `${i + 1}. ${r[1]}`).join("\n") + "\n\nEnter a number:")
    if (!choice) return
    const index = Number(choice) - 1
    const reason = reasons[index]?.[0]
    if (!reason) { toast.error("Please choose a valid report reason."); return }
    const details = window.prompt("Add details (optional):") ?? ""
    const res = await reportUser(targetUserId, reason, details)
    if (!res.ok) toast.error(res.error)
    else toast.success("Report sent to WIGOD for review.")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label="More account controls" className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-secondary" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={doMute} disabled={pending}>
          <VolumeX className="size-4" /> {muted ? "Unmute account" : "Mute account"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={doBlock} disabled={pending}>
          <Ban className="size-4" /> {blocked ? "Unblock account" : "Block account"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={doReport}>
          <Flag className="size-4" /> Report account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
