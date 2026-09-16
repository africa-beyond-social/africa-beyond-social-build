import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { SearchBar } from "@/components/search-bar"
import { FeedList, EmptyState } from "@/components/feed-list"
import { UserCard } from "@/components/user-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getFollowingSet,
  getRecentPosts,
  getSessionUser,
  getTrendingHashtags,
  searchPosts,
  searchProfiles,
} from "@/lib/queries"
import { Hash, SearchX, TrendingUp } from "lucide-react"

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  return (
    <div>
      <PageHeader title="Explore" subtitle="Discover people, posts and trends" />
      <div className="border-b border-border px-4 py-3">
        <SearchBar initialQuery={query} />
      </div>

      {query ? (
        <SearchResults query={query} currentUserId={currentUserId} />
      ) : (
        <DiscoverView currentUserId={currentUserId} />
      )}
    </div>
  )
}

async function SearchResults({ query, currentUserId }: { query: string; currentUserId: string | null }) {
  const [profiles, posts] = await Promise.all([searchProfiles(query), searchPosts(query, currentUserId)])
  const followingSet = await getFollowingSet(currentUserId, profiles.map((p) => p.id))

  return (
    <Tabs defaultValue="posts">
      <TabsList variant="line" className="w-full justify-start rounded-none border-b border-border px-4">
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="people">People ({profiles.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
        <FeedList
          posts={posts}
          currentUserId={currentUserId}
          empty={
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No posts found"
              description={`We couldn't find any posts matching "${query}".`}
            />
          }
        />
      </TabsContent>
      <TabsContent value="people">
        {profiles.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No people found"
            description={`We couldn't find anyone matching "${query}".`}
          />
        ) : (
          profiles.map((p) => (
            <UserCard key={p.id} profile={p} currentUserId={currentUserId} isFollowing={followingSet.has(p.id)} />
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

async function DiscoverView({ currentUserId }: { currentUserId: string | null }) {
  const [trending, recent] = await Promise.all([getTrendingHashtags(), getRecentPosts(currentUserId, 30)])

  return (
    <div>
      <section className="border-b border-border px-4 py-4">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-base font-bold">
          <TrendingUp className="size-4 text-brand-red" />
          Trending now
        </h2>
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No trends yet. Add a #hashtag to your posts to start a trend.
          </p>
        ) : (
          <ul className="flex flex-col">
            {trending.map((t, i) => (
              <li key={t.tag}>
                <Link
                  href={`/explore?q=${encodeURIComponent(t.tag)}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-brand-green">
                    <Hash className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.count} {t.count === 1 ? "post" : "posts"}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-4 py-3">
        <h2 className="font-serif text-base font-bold">Latest posts</h2>
      </div>
      <FeedList
        posts={recent}
        currentUserId={currentUserId}
        empty={
          <EmptyState
            icon={<Hash className="size-6" />}
            title="Nothing here yet"
            description="Be the first to post on Africa & Beyond Social."
          />
        }
      />
    </div>
  )
}
