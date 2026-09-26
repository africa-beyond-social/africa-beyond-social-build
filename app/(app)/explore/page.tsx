import Link from "next/link"
import type { ReactNode } from "react"
import { PageHeader } from "@/components/page-header"
import { SearchBar } from "@/components/search-bar"
import { FeedList, EmptyState } from "@/components/feed-list"
import { UserCard } from "@/components/user-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFollowingSet, getRecentPosts, getSessionUser, getDiscoveryEngine, getTrendingHashtags, searchPosts, searchProfiles } from "@/lib/queries"
import { ArrowRight, Compass, Hash, MessageCircle, Newspaper, PlaySquare, Radio, SearchX, Sparkles, Users, UserRoundPlus, Activity, ShieldCheck, Video } from "lucide-react"

export const dynamic = "force-dynamic"

const discoveryCards = [
  { label: "People", description: "Discover creators, voices and people to follow", icon: Users, href: "/explore?q=people" },
  { label: "Communities", description: "Join conversations and communities on WIGOD", icon: Users, href: "/community" },
  { label: "News", description: "Follow news conversations and current affairs", icon: Newspaper, href: "/news" },
  { label: "Media", description: "Watch videos, browse photos and discover creators", icon: PlaySquare, href: "/media" },
  { label: "Live", description: "Watch WIGOD Live broadcasts and join the room", icon: Radio, href: "/live" },
  { label: "Short Video", description: "Discover short-form video and creator moments", icon: Video, href: "/media?q=short-video" },
]

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const mode = query.toLowerCase()
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  return (
    <div>
      <PageHeader title="EXPLORE" subtitle="WIGOD • People. Places. Perspectives." />
      <section className="border-b border-border bg-secondary/20 px-4 py-4">
        <div className="mb-2 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Compass className="size-5" /></div>
          <div><h2 className="font-serif text-lg font-bold">Discover on WIGOD</h2><p className="text-xs leading-5 text-muted-foreground">Find people, conversations, communities, news, media and live experiences without leaving WIGOD.</p></div>
        </div>
        <SearchBar initialQuery={query} />
      </section>
      {query ? <SearchResults query={query} mode={mode} currentUserId={currentUserId} /> : <DiscoveryHome currentUserId={currentUserId} />}
    </div>
  )
}

async function DiscoveryHome({ currentUserId }: { currentUserId: string | null }) {
  const [discovery, trending, recent] = await Promise.all([
    getDiscoveryEngine(currentUserId, 6),
    getTrendingHashtags(8),
    getRecentPosts(currentUserId, 12),
  ])
  const people = Array.from(new Map([...discovery.newVoices, ...discovery.mutual, ...discovery.active, ...discovery.verified].map((p) => [p.id, p])).values())
  const followingSet = await getFollowingSet(currentUserId, people.map((profile) => profile.id))

  return (
    <div>
      <section className="border-b border-border px-4 py-5">
        <div className="mb-3"><h2 className="font-serif text-base font-bold">Discover</h2><p className="text-xs text-muted-foreground">Everything you need to find your next conversation, creator or community.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {discoveryCards.map(({ label, description, icon: Icon, href }) => (
            <Link key={label} href={href} className="group flex min-h-24 items-start gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-secondary">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand-green"><Icon className="size-4" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">{label}</p><p className="mt-1 text-xs leading-4 text-muted-foreground">{description}</p></div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border bg-secondary/10 px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="flex items-center gap-2 font-serif text-base font-bold"><Compass className="size-4 text-brand-green" /> People for you</h2><p className="text-xs text-muted-foreground">WIGOD finds people through meaningful connections, freshness and activity — not popularity alone.</p></div>
          <Link href="/explore?q=people" className="text-xs font-semibold text-brand-green">Find people</Link>
        </div>
        <div className="space-y-5">
          <DiscoveryRail title="People connected to your network" icon={<Users className="size-4 text-brand-green" />} items={discovery.mutual} reason="mutual" followingSet={followingSet} currentUserId={currentUserId} />
          <DiscoveryRail title="New voices" icon={<UserRoundPlus className="size-4 text-brand-red" />} items={discovery.newVoices} reason="new" followingSet={followingSet} currentUserId={currentUserId} />
          <DiscoveryRail title="Active conversations" icon={<Activity className="size-4 text-brand-green" />} items={discovery.active} reason="active" followingSet={followingSet} currentUserId={currentUserId} />
          {discovery.verified.length > 0 && <DiscoveryRail title="Verified WIGOD identities" icon={<ShieldCheck className="size-4 text-brand-red" />} items={discovery.verified} reason="verified" followingSet={followingSet} currentUserId={currentUserId} />}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-serif text-base font-bold"><Sparkles className="size-4 text-brand-red" /> What&apos;s trending</h2><p className="text-xs text-muted-foreground">Topics people are discussing on WIGOD</p></div><Link href="/explore?q=trending" className="text-xs font-semibold text-brand-green">See more</Link></div>
        {trending.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center"><Hash className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">No trends yet</p><p className="mt-1 text-xs text-muted-foreground">Add a #hashtag to a post to start a trend.</p></div> : <div className="grid gap-1 sm:grid-cols-2">{trending.map((t) => <Link key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 transition-colors hover:bg-secondary"><span className="flex size-8 items-center justify-center rounded-full bg-accent text-brand-green"><Hash className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{t.tag}</span><span className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "post" : "posts"}</span></span><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div>}
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center gap-2"><MessageCircle className="size-4 text-brand-red" /><div><h2 className="font-serif text-base font-bold">Latest conversations</h2><p className="text-xs text-muted-foreground">Recent posts from people using WIGOD</p></div></div>
        <FeedList posts={recent} currentUserId={currentUserId} empty={<EmptyState icon={<Sparkles className="size-6" />} title="Nothing here yet" description="Be one of the first people to start a conversation on WIGOD." />} />
      </section>

      <section className="px-4 py-5">
        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4">
          <div className="flex items-start gap-3"><Compass className="mt-0.5 size-5 shrink-0 text-brand-green" /><div><h2 className="font-serif text-base font-bold">Your WIGOD discovery hub</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Follow people, join communities, watch media, participate in live rooms and keep discovering new conversations—all inside WIGOD.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/community" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">Join communities</Link><Link href="/media" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">Watch media</Link><Link href="/live" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">Open WIGOD Live</Link></div></div></div>
        </div>
      </section>
    </div>
  )
}



function DiscoveryRail({
  title, icon, items, reason, followingSet, currentUserId,
}: {
  title: string
  icon: ReactNode
  items: Array<Awaited<ReturnType<typeof getDiscoveryEngine>>["newVoices"][number]>
  reason: "mutual" | "new" | "active" | "verified"
  followingSet: Set<string>
  currentUserId: string | null
}) {
  if (!items.length) return null
  return <div>
    <div className="mb-2 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
    <div className="grid gap-2 md:grid-cols-2">{items.map((profile) =>
      <UserCard key={profile.id} profile={profile} currentUserId={currentUserId} isFollowing={followingSet.has(profile.id)} discoveryReason={reason} mutualCount={profile.mutual_count} />
    )}</div>
  </div>
}

async function SearchResults({ query, mode, currentUserId }: { query: string; mode: string; currentUserId: string | null }) {
  const isPeopleMode = mode === "people"
  const isTrendingMode = mode === "trending"
  const hashtag = query.startsWith("#") ? query : ""
  const [profiles, posts, trending] = await Promise.all([
    isPeopleMode || isTrendingMode ? Promise.resolve([]) : searchProfiles(query),
    isPeopleMode || isTrendingMode ? Promise.resolve([]) : searchPosts(query, currentUserId),
    hashtag || isTrendingMode ? getTrendingHashtags(20) : Promise.resolve([]),
  ])
  const followingSet = await getFollowingSet(currentUserId, profiles.map((p) => p.id))
  const hashtagPosts = hashtag ? await searchPosts(hashtag, currentUserId) : []
  const shownPosts = hashtag ? hashtagPosts : posts

  return (
    <Tabs defaultValue={isPeopleMode ? "people" : "posts"}>
      <TabsList variant="line" className="w-full justify-start rounded-none border-b border-border px-4">
        <TabsTrigger value="posts">Posts ({shownPosts.length})</TabsTrigger>
        <TabsTrigger value="people">People ({profiles.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="posts"><FeedList posts={shownPosts} currentUserId={currentUserId} empty={<EmptyState icon={<SearchX className="size-6" />} title="No posts found" description={`We couldn&apos;t find any posts matching "${query}".`} />} /></TabsContent>
      <TabsContent value="people">{isTrendingMode ? (
        <div className="grid gap-1 px-4 py-5 sm:grid-cols-2">
          {trending.map((t) => (
            <Link key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 transition-colors hover:bg-secondary">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-brand-green"><Hash className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{t.tag}</span><span className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "post" : "posts"}</span></span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      ) : profiles.length === 0 ? <EmptyState icon={<SearchX className="size-6" />} title="No people found" description={`We couldn&apos;t find anyone matching "${query}".`} /> : profiles.map((p) => <UserCard key={p.id} profile={p} currentUserId={currentUserId} isFollowing={followingSet.has(p.id)} />)}</TabsContent>
    </Tabs>
  )
}
