import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Globe2, MapPin, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { UserCard } from "@/components/user-card"
import { getFollowingSet, getRecentPosts, getSessionUser, searchPosts, searchProfiles } from "@/lib/queries"
import { africanCities, findAfricanCity, findAfricanCountry, findRegion, findWorldRegion, slugify } from "@/lib/explore-data"

export default async function ExploreDestinationPage({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params
  if (segments.length !== 2) notFound()

  const [kind, slug] = segments
  let place: { name: string; description: string; search: string; backHref: string; category: string } | null = null

  if (kind === "countries") {
    const country = findAfricanCountry(slug)
    if (country) place = { ...country, description: `Discover conversations, people and stories connected to ${country.name}.`, backHref: "/explore", category: "African country" }
  } else if (kind === "cities") {
    const city = findAfricanCity(slug)
    if (city) place = { ...city, description: `Discover conversations, people and stories connected to ${city.name}.`, backHref: "/explore", category: "African city" }
  } else if (kind === "regions") {
    const region = findRegion(slug)
    if (region) place = { ...region, backHref: "/explore", category: "African region" }
  } else if (kind === "world") {
    const region = findWorldRegion(slug)
    if (region) place = { ...region, backHref: "/explore", category: "Beyond Africa" }
  }

  if (!place) notFound()

  const user = await getSessionUser()
  const currentUserId = user?.id ?? null
  const [posts, profiles] = await Promise.all([
    searchPosts(place.search, currentUserId),
    searchProfiles(place.search),
  ])
  const followingSet = await getFollowingSet(currentUserId, profiles.map((profile) => profile.id))

  const relatedCountries = kind === "countries" ? [] : africanCities.slice(0, 8)

  return (
    <div>
      <PageHeader title={place.name} subtitle={`${place.category} • Africa & Beyond`} backHref={place.backHref} />

      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-6">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            {kind === "cities" ? <MapPin className="size-5" /> : <Globe2 className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">{place.category}</p>
            <h2 className="mt-1 font-serif text-2xl font-bold">{place.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{place.description}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link href={`/explore?q=${encodeURIComponent(place.search)}`} className="rounded-xl border border-border bg-background/80 p-3 text-sm font-semibold hover:bg-secondary">
            All conversations
          </Link>
          <Link href={`/explore?q=${encodeURIComponent(`${place.search} news`)}`} className="rounded-xl border border-border bg-background/80 p-3 text-sm font-semibold hover:bg-secondary">
            News
          </Link>
          <Link href={`/explore?q=${encodeURIComponent(`${place.search} media`)}`} className="rounded-xl border border-border bg-background/80 p-3 text-sm font-semibold hover:bg-secondary">
            Media
          </Link>
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold">People & communities</h2>
            <p className="text-xs text-muted-foreground">People whose profiles match this place</p>
          </div>
          <Users className="size-4 text-muted-foreground" />
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching people yet.</p>
        ) : (
          <div className="space-y-1">
            {profiles.slice(0, 6).map((profile) => (
              <UserCard key={profile.id} profile={profile} currentUserId={currentUserId} isFollowing={followingSet.has(profile.id)} />
            ))}
          </div>
        )}
      </section>

      {kind === "cities" && (
        <section className="border-b border-border px-4 py-5">
          <h2 className="font-serif text-base font-bold">More African cities</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedCountries.map((city) => (
              <Link key={city.slug} href={`/explore/cities/${slugify(city.name)}`} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                {city.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-5">
        <div className="mb-3">
          <h2 className="font-serif text-base font-bold">Latest conversations</h2>
          <p className="text-xs text-muted-foreground">Recent posts matching {place.name}</p>
        </div>
        <FeedList
          posts={posts}
          currentUserId={currentUserId}
          empty={
            <EmptyState
              icon={<Globe2 className="size-6" />}
              title={`No conversations about ${place.name} yet`}
              description="Start the conversation and help build this place's community on Africa & Beyond Social."
            />
          }
        />
      </section>

      <div className="border-t border-border px-4 py-4">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline">
          <ArrowLeft className="size-4" /> Back to Explore Africa & Beyond
        </Link>
      </div>
    </div>
  )
}
