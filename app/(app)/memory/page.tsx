import { Bookmark } from "lucide-react"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getSavedPosts, getSessionUser } from "@/lib/queries"

export default async function MemoryPage() {
  const user = await getSessionUser()
  if (!user) return null
  const posts = await getSavedPosts(user.id)
  return (
    <section>
      <div className="border-b border-border px-4 py-4">
        <h1 className="font-serif text-xl font-bold">Memory</h1>
        <p className="text-sm text-muted-foreground">Posts you saved for later.</p>
      </div>
      <FeedList
        posts={posts}
        currentUserId={user.id}
        empty={<EmptyState icon={<Bookmark className="size-6" />} title="Your Memory is empty" description="Save posts and they will appear here." />}
      />
    </section>
  )
}
