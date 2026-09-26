import Link from "next/link"
import { UserAvatar } from "@/components/user-avatar"
import { FollowButton } from "@/components/follow-button"
import { VerificationBadge } from "@/components/verification-badge"
import type { Profile } from "@/lib/types"

export function UserCard({
  profile,
  currentUserId,
  isFollowing,
  discoveryReason,
  mutualCount,
  followerCount,
}: {
  discoveryReason?: "mutual" | "new" | "active" | "verified"
  mutualCount?: number
  followerCount?: number
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
            <p className="flex min-w-0 items-center gap-1.5 truncate font-semibold leading-tight hover:underline">
              <span className="truncate">{profile.display_name ?? profile.username}</span>
              <VerificationBadge type={profile.verification_type} size="xs" />
              {Date.now() - new Date(profile.created_at).getTime() < 14 * 24 * 60 * 60 * 1000 && (
                <span className="shrink-0 rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-green">New</span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">@{profile.username}{typeof followerCount === "number" && <> · {followerCount} follower{followerCount === 1 ? "" : "s"}</>}</p>
          </Link>
          {currentUserId && currentUserId !== profile.id && (
            <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} size="sm" />
          )}
        </div>

        {profile.bio && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{profile.bio}</p>}
        {discoveryReason && (
          <p className="mt-1.5 text-[11px] font-medium text-brand-green">
            {discoveryReason === "mutual" && `${mutualCount ?? 0} mutual connection${(mutualCount ?? 0) === 1 ? "" : "s"}`}
            {discoveryReason === "new" && "New to WIGOD"}
            {discoveryReason === "active" && "Active on WIGOD"}
            {discoveryReason === "verified" && "Verified WIGOD identity"}
          </p>
        )}
      </div>
    </div>
  )
}
