"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { toggleFollow } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FollowButton({
  targetUserId,
  initialFollowing,
  size = "default",
  className,
}: {
  targetUserId: string
  initialFollowing: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [hovering, setHovering] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      const res = await toggleFollow(targetUserId)
      if (!res.ok) {
        setFollowing(!next)
        toast.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const label = following ? (hovering ? "Unfollow" : "Following") : "Follow"

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      onClick={onClick}
      disabled={isPending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "rounded-full font-semibold",
        following && hovering && "border-destructive/40 text-destructive",
        className,
      )}
    >
      {label}
    </Button>
  )
}
