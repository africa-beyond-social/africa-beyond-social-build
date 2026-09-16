import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { PostCard } from "@/components/post-card"
import { ReplyComposer } from "@/components/reply-composer"
import { UserAvatar } from "@/components/user-avatar"
import { PostContent } from "@/components/post-content"
import { getCurrentProfile, getReplies, getSessionUser, getSinglePost } from "@/lib/queries"
import { relativeTime } from "@/lib/format"

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  const [post, replies, profile] = await Promise.all([
    getSinglePost(id, currentUserId),
    getReplies(id),
    getCurrentProfile(),
  ])

  if (!post) notFound()

  return (
    <div>
      <PageHeader title="Post" backHref="/" />

      <PostCard post={post} currentUserId={currentUserId} emphasize />

      <ReplyComposer postId={post.id} profile={profile} />

      {replies.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No replies yet. Be the first to reply.
        </p>
      ) : (
        <div>
          {replies.map((reply) => (
            <article key={reply.id} className="flex gap-3 border-b border-border px-4 py-3">
              <Link href={`/profile/${reply.author.username}`} className="shrink-0">
                <UserAvatar
                  displayName={reply.author.display_name}
                  username={reply.author.username}
                  avatarUrl={reply.author.avatar_url}
                  className="size-9"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <Link href={`/profile/${reply.author.username}`} className="truncate font-semibold hover:underline">
                    {reply.author.display_name ?? reply.author.username}
                  </Link>
                  <span className="truncate text-muted-foreground">@{reply.author.username}</span>
                  <span className="text-muted-foreground">·</span>
                  <time className="shrink-0 text-muted-foreground" dateTime={reply.created_at}>
                    {relativeTime(reply.created_at)}
                  </time>
                </div>
                <div className="mt-0.5">
                  <PostContent content={reply.content} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
