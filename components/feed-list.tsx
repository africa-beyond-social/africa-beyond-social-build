import { PostCard } from "@/components/post-card"
import type { FeedPost } from "@/lib/types"
import type { ReactNode } from "react"

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-brand-green">{icon}</span>
      <h2 className="font-serif text-lg font-bold">{title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function FeedList({
  posts,
  currentUserId,
  empty,
}: {
  posts: FeedPost[]
  currentUserId: string | null
  empty?: ReactNode
}) {
  if (posts.length === 0 && empty) return <>{empty}</>
  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.reposted_by ? `rp-${post.id}-${post.reposted_by.id}` : post.id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
