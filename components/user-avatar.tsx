import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsFrom } from "@/lib/format"
import { cn } from "@/lib/utils"

export function UserAvatar({
  displayName,
  username,
  avatarUrl,
  size = "default",
  className,
}: {
  displayName: string | null
  username: string
  avatarUrl: string | null
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={cn(size === "lg" && "size-16", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={`${displayName ?? username} avatar`} /> : null}
      <AvatarFallback className="bg-accent font-semibold text-brand-green">
        {initialsFrom(displayName, username)}
      </AvatarFallback>
    </Avatar>
  )
}
