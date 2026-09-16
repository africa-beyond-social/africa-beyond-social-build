import { PageHeader } from "@/components/page-header"
import { PostComposer } from "@/components/post-composer"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getCurrentProfile, getHomeFeed, getSessionUser } from "@/lib/queries"
import { Sparkles } from "lucide-react"

export default async function HomePage() {
  const user = await getSessionUser()
  const [profile, posts] = await Promise.all([getCurrentProfile(), user ? getHomeFeed(user.id) : Promise.resolve([])])

  return (
    <div>
      <PageHeader title="Home" subtitle="Your personalized feed" />

      <div className="hidden border-b border-border px-4 py-4 md:block">
        <PostComposer profile={profile} />
      </div>

      <FeedList
        posts={posts}
        currentUserId={user?.id ?? null}
        empty={
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="Your feed is quiet"
            description="Follow people on Explore, or share your first post to get the conversation started."
          />
        }
      />
    </div>
  )
}
