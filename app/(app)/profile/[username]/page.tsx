import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, MessageCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { UserAvatar } from "@/components/user-avatar"
import { FollowButton } from "@/components/follow-button"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import {
  getFollowStats,
  getPostsByUser,
  getProfileByUsername,
  getSessionUser,
} from "@/lib/queries"
import { joinDate } from "@/lib/format"
import { FileText } from "lucide-react"
import { VerificationBadge } from "@/components/verification-badge"
import { AccountControls } from "@/components/account-controls"

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const [profile, user] = await Promise.all([getProfileByUsername(username), getSessionUser()])
  if (!profile) notFound()

  const currentUserId = user?.id ?? null
  const isSelf = currentUserId === profile.id

  const [stats, posts] = await Promise.all([
    getFollowStats(profile.id, currentUserId),
    getPostsByUser(profile.id, currentUserId),
  ])

  return (
    <div>
      <PageHeader title={profile.display_name ?? profile.username} subtitle={`${posts.length} posts`} backHref="/" />

      <div className="border-b border-border px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <UserAvatar
            displayName={profile.display_name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            className="size-20 text-xl"
          />
          {isSelf ? (
            <EditProfileDialog profile={profile} />
          ) : currentUserId ? (
            <div className="flex items-center gap-2">
              <AccountControls targetUserId={profile.id} />
              <Link href={`/messages?with=${encodeURIComponent(profile.username)}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                <MessageCircle className="size-4" />
                Message
              </Link>
              <FollowButton targetUserId={profile.id} initialFollowing={stats.isFollowing} />
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2"><h2 className="font-serif text-xl font-bold leading-tight">{profile.display_name ?? profile.username}</h2><VerificationBadge type={profile.verification_type} size="sm" showLabel /></div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>

        {profile.bio && <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{profile.bio}</p>}

        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>Joined {joinDate(profile.created_at)}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-secondary/20">
          <Link href={`/profile/${profile.username}/following`} className="px-3 py-2.5 text-center hover:bg-secondary">
            <span className="block font-bold text-foreground">{stats.following}</span>
            <span className="text-xs text-muted-foreground">Following</span>
          </Link>
          <Link href={`/profile/${profile.username}/followers`} className="border-x border-border px-3 py-2.5 text-center hover:bg-secondary">
            <span className="block font-bold text-foreground">{stats.followers}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </Link>
          <div className="px-3 py-2.5 text-center">
            <span className="block font-bold text-foreground">{posts.length}</span>
            <span className="text-xs text-muted-foreground">Posts</span>
          </div>
        </div>
      </div>

      <FeedList
        posts={posts}
        currentUserId={currentUserId}
        empty={
          <EmptyState
            icon={<FileText className="size-6" />}
            title={isSelf ? "You haven't posted yet" : "No posts yet"}
            description={isSelf ? "Your posts will show up here. Share your first one." : `@${profile.username} hasn't posted anything yet.`}
          />
        }
      />
    </div>
  )
}
