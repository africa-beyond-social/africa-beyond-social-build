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
import {
  ArrowRight,
  Globe2,
  Hash,
  MapPin,
  Newspaper,
  Radio,
  SearchX,
  TrendingUp,
  Users,
  Video,
} from "lucide-react"

const regions = [
  { name: "Southern Africa", description: "SADC and the countries of the south", query: "Southern Africa" },
  { name: "East Africa", description: "The Horn, Great Lakes and Indian Ocean", query: "East Africa" },
  { name: "West Africa", description: "Atlantic states and the wider region", query: "West Africa" },
  { name: "Central Africa", description: "The Congo Basin and central states", query: "Central Africa" },
  { name: "North Africa", description: "The Mediterranean and Sahara", query: "North Africa" },
  { name: "Sahel", description: "Communities across the southern Sahara", query: "Sahel" },
]

const countries = [
  "Zimbabwe",
  "South Africa",
  "Zambia",
  "Botswana",
  "Mozambique",
  "Malawi",
  "Namibia",
  "Kenya",
  "Tanzania",
  "Nigeria",
  "Ghana",
  "Rwanda",
]

const exploreLinks = [
  { label: "Africa News", description: "Discover conversations around African news", icon: Newspaper, query: "news" },
  { label: "Media", description: "Find videos, photos and media posts", icon: Video, query: "media" },
  { label: "Live", description: "Explore live conversations and broadcasts", icon: Radio, query: "live" },
  { label: "People & Communities", description: "Find voices and communities across Africa", icon: Users, query: "Africa" },
]

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  return (
    <div>
      <PageHeader title="EXPLORE AFRICA" subtitle="People. Places. Perspectives." />
      <div className="border-b border-border bg-background px-4 py-3">
        <SearchBar initialQuery={query} />
      </div>

      {query ? (
        <SearchResults query={query} currentUserId={currentUserId} />
      ) : (
        <AfricaExplore currentUserId={currentUserId} />
      )}
    </div>
  )
}

async function AfricaExplore({ currentUserId }: { currentUserId: string | null }) {
  const [trending, recent] = await Promise.all([getTrendingHashtags(8), getRecentPosts(currentUserId, 12)])

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <Globe2 className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">Explore Africa</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Navigate countries, regions, stories, media and communities from one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Countries", icon: MapPin },
            { label: "Regions", icon: Globe2 },
            { label: "News", icon: Newspaper },
            { label: "Live", icon: Radio },
          ].map(({ label, icon: Icon }) => (
            <Link
              key={label}
              href={`/explore?q=${encodeURIComponent(label)}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Icon className="size-4 text-brand-green" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold">Regions of Africa</h2>
            <p className="text-xs text-muted-foreground">Start exploring by region</p>
          </div>
          <Globe2 className="size-4 text-muted-foreground" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {regions.map((region) => (
            <Link
              key={region.name}
              href={`/explore?q=${encodeURIComponent(region.query)}`}
              className="group rounded-xl border border-border p-3 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{region.name}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{region.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold">Countries</h2>
            <p className="text-xs text-muted-foreground">Jump into country conversations</p>
          </div>
          <Link href="/explore?q=country" className="text-xs font-semibold text-brand-green hover:underline">
            View all
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <Link
              key={country}
              href={`/explore?q=${encodeURIComponent(country)}`}
              className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              {country}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <h2 className="mb-3 font-serif text-base font-bold">Explore by interest</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {exploreLinks.map(({ label, description, icon: Icon, query }) => (
            <Link
              key={label}
              href={`/explore?q=${encodeURIComponent(query)}`}
              className="flex gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand-green">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-base font-bold">
          <TrendingUp className="size-4 text-brand-red" />
          Trending across Africa
        </h2>
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trends yet. Add a #hashtag to your posts to start a trend.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {trending.map((t, i) => (
              <Link
                key={t.tag}
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
            ))}
          </div>
        )}
      </section>

      <div className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-base font-bold">Latest across Africa</h2>
          <Link href="/explore?q=news" className="text-xs font-semibold text-brand-green hover:underline">
            Explore more
          </Link>
        </div>
        <FeedList
          posts={recent}
          currentUserId={currentUserId}
          empty={
            <EmptyState
              icon={<Globe2 className="size-6" />}
              title="Nothing here yet"
              description="Be the first to post on Africa & Beyond Social."
            />
          }
        />
      </div>
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
