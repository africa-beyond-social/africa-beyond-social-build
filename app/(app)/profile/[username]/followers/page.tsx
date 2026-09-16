import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { ConnectionList } from "@/components/connection-list"
import { getConnectionProfiles, getFollowingSet, getProfileByUsername, getSessionUser } from "@/lib/queries"

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const [profile, user] = await Promise.all([getProfileByUsername(username), getSessionUser()])
  if (!profile) notFound()

  const currentUserId = user?.id ?? null
  const profiles = await getConnectionProfiles(profile.id, "followers")
  const followingSet = await getFollowingSet(currentUserId, profiles.map((p) => p.id))

  return (
    <div>
      <PageHeader title={profile.display_name ?? profile.username} subtitle="Followers" backHref={`/profile/${profile.username}`} />
      <ConnectionList
        profiles={profiles}
        currentUserId={currentUserId}
        followingSet={followingSet}
        emptyTitle="No followers yet"
        emptyDescription={`When people follow @${profile.username}, they'll appear here.`}
      />
    </div>
  )
}
