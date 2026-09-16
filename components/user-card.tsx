import Link from "next/link"
import { UserAvatar } from "@/components/user-avatar"
import { FollowButton } from "@/components/follow-button"
import type { Profile } from "@/lib/types"

export function UserCard({
  profile,
  currentUserId,
  isFollowing,
}: {
  profile: Profile
  currentUserId: string | null
  isFollowing: boolean
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-secondary/40">
      <Link href={`/profile/${profile.username}`} className="shrink-0">
        <UserAvatar
          displayName={profile.display_name}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          className="size-11"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/profile/${profile.username}`} className="min-w-0">
            <p className="truncate font-semibold leading-tight hover:underline">
              {profile.display_name ?? profile.username}
            </p>
            <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
          </Link>
          {currentUserId && currentUserId !== profile.id && (
            <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} size="sm" />
          )}
        </div>
        {profile.bio && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{profile.bio}</p>}
      </div>
    </div>
  )
}
