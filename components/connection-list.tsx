import { UserCard } from "@/components/user-card"
import { EmptyState } from "@/components/feed-list"
import { Users } from "lucide-react"
import type { Profile } from "@/lib/types"

export function ConnectionList({
  profiles,
  currentUserId,
  followingSet,
  emptyTitle,
  emptyDescription,
}: {
  profiles: Profile[]
  currentUserId: string | null
  followingSet: Set<string>
  emptyTitle: string
  emptyDescription: string
}) {
  if (profiles.length === 0) {
    return <EmptyState icon={<Users className="size-6" />} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <div>
      {profiles.map((profile) => (
        <UserCard
          key={profile.id}
          profile={profile}
          currentUserId={currentUserId}
          isFollowing={followingSet.has(profile.id)}
        />
      ))}
    </div>
  )
}
