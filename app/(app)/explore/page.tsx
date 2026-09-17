import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { SearchBar } from "@/components/search-bar"
import { FeedList, EmptyState } from "@/components/feed-list"
import { UserCard } from "@/components/user-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFollowingSet, getRecentPosts, getSessionUser, getTrendingHashtags, searchPosts, searchProfiles } from "@/lib/queries"
import { africanCities, africanCountries, africaRegions, worldRegions } from "@/lib/explore-data"
import { ArrowRight, Building2, Globe2, Hash, MapPin, Newspaper, Radio, SearchX, TrendingUp, Users, Video } from "lucide-react"

const quickLinks = [
  { label: "Countries", description: "Discover African countries", icon: MapPin, href: "/explore#countries" },
  { label: "Regions", description: "Explore Africa by region", icon: Globe2, href: "/explore#regions" },
  { label: "Cities", description: "Discover African cities", icon: Building2, href: "/explore#cities" },
  { label: "News", description: "Follow African news conversations", icon: Newspaper, href: "/explore?q=news" },
  { label: "Media", description: "Find videos, photos and media", icon: Video, href: "/explore?q=media" },
  { label: "Live", description: "Explore live conversations", icon: Radio, href: "/explore?q=live" },
]

const exploreLinks = [
  { label: "Africa News", description: "Discover conversations around African news", icon: Newspaper, query: "news" },
  { label: "Media", description: "Find videos, photos and media posts", icon: Video, query: "media" },
  { label: "Live", description: "Explore live conversations and broadcasts", icon: Radio, query: "live" },
  { label: "People & Communities", description: "Find voices and communities across Africa and beyond", icon: Users, query: "Africa" },
]

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  return (
    <div>
      <PageHeader title="EXPLORE AFRICA & BEYOND" subtitle="People. Places. Perspectives." />
      <section className="border-b border-border bg-secondary/20 px-4 py-4">
        <div className="mb-2">
          <h2 className="font-serif text-lg font-bold">Global Discovery</h2>
          <p className="text-xs text-muted-foreground">Explore Africa first, then discover people, places, news, media and conversations from around the world.</p>
        </div>
        <SearchBar initialQuery={query} />
      </section>
      {query ? <SearchResults query={query} currentUserId={currentUserId} /> : <GlobalExplore currentUserId={currentUserId} />}
    </div>
  )
}

async function GlobalExplore({ currentUserId }: { currentUserId: string | null }) {
  const [trending, recent] = await Promise.all([getTrendingHashtags(8), getRecentPosts(currentUserId, 12)])
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Globe2 className="size-5" /></div>
          <div><h2 className="font-serif text-xl font-bold">Africa at a glance</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Start with Africa, then connect with people, stories and conversations from the wider world.</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map(({ label, description, icon: Icon, href }) => <Link key={label} href={href} className="group rounded-xl border border-border bg-background/80 p-3 transition-colors hover:bg-secondary"><Icon className="mb-2 size-4 text-brand-green" /><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p></Link>)}
        </div>
      </section>

      <section id="regions" className="scroll-mt-16 border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Regions of Africa</h2><p className="text-xs text-muted-foreground">Start exploring by region</p></div><Globe2 className="size-4 text-muted-foreground" /></div>
        <div className="grid gap-2 sm:grid-cols-2">{africaRegions.map((region) => <Link key={region.slug} href={`/explore/regions/${region.slug}`} className="group rounded-xl border border-border p-3 transition-colors hover:bg-secondary"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{region.name}</span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div><p className="mt-1 text-xs text-muted-foreground">{region.description}</p></Link>)}</div>
      </section>

      <section id="countries" className="scroll-mt-16 border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Countries of Africa</h2><p className="text-xs text-muted-foreground">Explore conversations by country</p></div><span className="text-xs text-muted-foreground">54 countries</span></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{africanCountries.map((country) => <Link key={country.slug} href={`/explore/countries/${country.slug}`} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary">{country.name}</Link>)}</div>
      </section>

      <section id="cities" className="scroll-mt-16 border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">African cities</h2><p className="text-xs text-muted-foreground">Discover conversations from major cities</p></div><span className="text-xs text-muted-foreground">{africanCities.length} cities</span></div>
        <div className="flex flex-wrap gap-2">{africanCities.map((city) => <Link key={city.slug} href={`/explore/cities/${city.slug}`} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-secondary">{city.name}</Link>)}</div>
      </section>

      <section className="border-b border-border px-4 py-5"><div className="mb-3"><h2 className="font-serif text-base font-bold">Explore by interest</h2><p className="text-xs text-muted-foreground">Follow conversations across Africa and the wider world</p></div><div className="grid gap-2 sm:grid-cols-2">{exploreLinks.map(({ label, description, icon: Icon, query }) => <Link key={label} href={`/explore?q=${encodeURIComponent(query)}`} className="flex gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand-green"><Icon className="size-4" /></div><div className="min-w-0"><p className="font-semibold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><ArrowRight className="ml-auto mt-1 size-4 shrink-0 text-muted-foreground" /></Link>)}</div></section>

      <section className="border-b border-border bg-secondary/15 px-4 py-5">
        <div className="mb-3 flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-brand-green"><Globe2 className="size-5" /></div><div><h2 className="font-serif text-base font-bold">Beyond Africa</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Africa is our home base. Explore the rest of the world and the connections between Africa and global communities.</p></div></div>
        <div className="grid gap-2 sm:grid-cols-2">{worldRegions.map((region) => <Link key={region.slug} href={`/explore/world/${region.slug}`} className="group rounded-xl border border-border bg-background p-3 transition-colors hover:bg-secondary"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{region.name}</span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div><p className="mt-1 text-xs text-muted-foreground">{region.description}</p></Link>)}</div>
      </section>

      <section className="border-b border-border px-4 py-5"><div className="mb-3"><h2 className="flex items-center gap-2 font-serif text-base font-bold"><TrendingUp className="size-4 text-brand-red" />Trending across Africa & Beyond</h2><p className="mt-0.5 text-xs text-muted-foreground">What people are talking about right now</p></div>{trending.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center"><Hash className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">No trends yet</p><p className="mt-1 text-xs text-muted-foreground">Add a #hashtag to a post to start a trend.</p></div> : <div className="grid gap-1 sm:grid-cols-2">{trending.map((t, i) => <Link key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"><span className="flex size-9 items-center justify-center rounded-full bg-accent text-brand-green"><Hash className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{t.tag}</span><span className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "post" : "posts"}</span></span><span className="text-xs font-medium text-muted-foreground">#{i + 1}</span></Link>)}</div>}</section>

      <section className="px-4 py-5"><div className="mb-2 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Latest across Africa & Beyond</h2><p className="text-xs text-muted-foreground">Recent conversations from the community</p></div><Link href="/explore?q=news" className="text-xs font-semibold text-brand-green hover:underline">Explore more</Link></div><FeedList posts={recent} currentUserId={currentUserId} empty={<EmptyState icon={<Globe2 className="size-6" />} title="Nothing here yet" description="Be the first to post on Africa & Beyond Social." />} /></section>
    </div>
  )
}

async function SearchResults({ query, currentUserId }: { query: string; currentUserId: string | null }) {
  const [profiles, posts] = await Promise.all([searchProfiles(query), searchPosts(query, currentUserId)])
  const followingSet = await getFollowingSet(currentUserId, profiles.map((p) => p.id))
  const q = query.toLowerCase()
  const placeResults = [
    ...africaRegions.filter((item) => item.name.toLowerCase().includes(q)).map((item) => ({ ...item, kind: "African region", href: `/explore/regions/${item.slug}` })),
    ...africanCountries.filter((item) => item.name.toLowerCase().includes(q)).map((item) => ({ ...item, kind: "African country", href: `/explore/countries/${item.slug}` })),
    ...africanCities.filter((item) => item.name.toLowerCase().includes(q)).map((item) => ({ ...item, kind: "African city", href: `/explore/cities/${item.slug}` })),
    ...worldRegions.filter((item) => item.name.toLowerCase().includes(q)).map((item) => ({ ...item, kind: "World region", href: `/explore/world/${item.slug}` })),
  ]

  return (
    <Tabs defaultValue={placeResults.length > 0 ? "places" : "posts"}>
      <TabsList variant="line" className="w-full justify-start rounded-none border-b border-border px-4">
        {placeResults.length > 0 && <TabsTrigger value="places">Places ({placeResults.length})</TabsTrigger>}
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="people">People ({profiles.length})</TabsTrigger>
      </TabsList>
      {placeResults.length > 0 && (
        <TabsContent value="places" className="px-4 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {placeResults.map((place) => (
              <Link key={`${place.kind}-${place.slug}`} href={place.href} className="group rounded-xl border border-border p-4 transition-colors hover:bg-secondary">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand-green"><Globe2 className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{place.name}</p><p className="text-xs text-muted-foreground">{place.kind}</p></div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>
      )}
      <TabsContent value="posts"><FeedList posts={posts} currentUserId={currentUserId} empty={<EmptyState icon={<SearchX className="size-6" />} title="No posts found" description={`We couldn't find any posts matching "${query}".`} />} /></TabsContent>
      <TabsContent value="people">{profiles.length === 0 ? <EmptyState icon={<SearchX className="size-6" />} title="No people found" description={`We couldn't find anyone matching "${query}".`} /> : profiles.map((p) => <UserCard key={p.id} profile={p} currentUserId={currentUserId} isFollowing={followingSet.has(p.id)} />)}</TabsContent>
    </Tabs>
  )
}
