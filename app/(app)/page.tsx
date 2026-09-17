import { PageHeader } from "@/components/page-header"
import { PostComposer } from "@/components/post-composer"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getCurrentProfile, getHomeFeed, getSessionUser } from "@/lib/queries"
import { Compass, Globe2, Radio, Sparkles } from "lucide-react"

const feedTabs = ["For You", "Following", "Africa", "News", "Media", "Community", "Live"]

export default async function HomePage() {
  const user = await getSessionUser()
  const [profile, posts] = await Promise.all([getCurrentProfile(), user ? getHomeFeed(user.id) : Promise.resolve([])])

  return (
    <div className="min-h-full">
      <PageHeader
        title="Africa & Beyond Social"
        subtitle="People. Places. Perspectives."
      />

      <section className="border-b border-border bg-gradient-to-r from-brand-green/10 via-background to-brand-red/10 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
            <Globe2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-bold">What’s happening across Africa?</h2>
            <p className="text-xs text-muted-foreground">Share a story, perspective, photo or moment from where you are.</p>
          </div>
        </div>
        <div className="mt-3 hidden md:block">
          <PostComposer profile={profile} />
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 scrollbar-none md:px-4">
        {feedTabs.map((tab, index) => (
          <div
            key={tab}
            className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold ${index === 0 ? "border-b-2 border-brand-red text-foreground" : "text-muted-foreground"}`}
          >
            {tab === "Africa" && <Compass className="size-4" />}
            {tab === "Live" && <Radio className="size-4" />}
            {tab}
          </div>
        ))}
      </div>

      <div className="border-b border-border px-4 py-2 md:hidden">
        <PostComposer profile={profile} />
      </div>

      <FeedList
        posts={posts}
        currentUserId={user?.id ?? null}
        empty={
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="Your Africa feed is quiet"
            description="Follow people on Explore Africa, or share your first perspective to get the conversation started."
          />
        }
      />
    </div>
  )
}
