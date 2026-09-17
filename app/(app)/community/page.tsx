import Link from "next/link"
import { Globe2, Hash, MapPin, MessageCircle, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/feed-list"
import { getRecentPosts, getSessionUser, getTrendingHashtags } from "@/lib/queries"
import { africanCities, africanCountries, africaRegions, worldRegions } from "@/lib/explore-data"

const communityAreas = [
  { label: "African Communities", description: "Connect around countries, regions and cities across Africa.", href: "/explore", icon: Globe2 },
  { label: "African Diaspora", description: "Find conversations connecting African communities around the world.", href: "/explore?q=African%20Diaspora", icon: Users },
  { label: "Global Communities", description: "Explore conversations across Europe, Asia-Pacific, the Americas and the Middle East.", href: "/explore?q=Global", icon: Globe2 },
  { label: "Interest Communities", description: "Discover people and conversations through shared interests and topics.", href: "/explore", icon: Hash },
]

export default async function CommunityPage() {
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null
  const [trending, recent] = await Promise.all([getTrendingHashtags(6), getRecentPosts(currentUserId, 8)])

  return (
    <div>
      <PageHeader title="COMMUNITY" subtitle="People. Places. Perspectives. Across Africa and the world." />
      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Users className="size-5" /></div>
          <div><h2 className="font-serif text-xl font-bold">Africa & Beyond Community</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">A global meeting place for people, communities and conversations — from African neighbourhoods to the African diaspora and the wider world.</p></div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3"><h2 className="font-serif text-base font-bold">Find your community</h2><p className="text-xs text-muted-foreground">Explore communities by geography or shared interest.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{communityAreas.map(({ label, description, href, icon: Icon }) => <Link key={label} href={href} className="group rounded-2xl border border-border p-4 transition hover:bg-secondary"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Icon className="size-4" /></div><div><h3 className="text-sm font-semibold group-hover:text-brand-green">{label}</h3><p className="mt-1 text-xs leading-4 text-muted-foreground">{description}</p></div></div></Link>)}</div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">African places</h2><p className="text-xs text-muted-foreground">Enter conversations by region, country or city.</p></div><MapPin className="size-4 text-muted-foreground" /></div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">{africaRegions.map((region) => <Link key={region.slug} href={`/explore/${region.slug}`} className="rounded-xl border border-border p-3 hover:bg-secondary"><p className="text-sm font-semibold">{region.name}</p><p className="mt-1 text-xs text-muted-foreground">{region.description}</p></Link>)}</div>
        <div className="flex flex-wrap gap-2">{africanCountries.slice(0, 18).map((country) => <Link key={country.slug} href={`/explore/${country.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">{country.name}</Link>)}</div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3"><h2 className="font-serif text-base font-bold">The world beyond Africa</h2><p className="text-xs text-muted-foreground">Keep Africa connected to global conversations.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{worldRegions.map((region) => <Link key={region.slug} href={`/explore/${region.slug}`} className="rounded-xl border border-border p-3 hover:bg-secondary"><p className="text-sm font-semibold">{region.name}</p><p className="mt-1 text-xs text-muted-foreground">{region.description}</p></Link>)}</div>
      </section>

      <section className="border-b border-border px-4 py-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Trending communities</h2><p className="text-xs text-muted-foreground">Topics currently generating conversation.</p></div><Hash className="size-4 text-muted-foreground" /></div>{trending.length === 0 ? <EmptyState icon={<MessageCircle className="size-6" />} title="No trending communities yet" description="As conversations grow, active topics will appear here." /> : <div className="grid gap-2 sm:grid-cols-2">{trending.map(({ tag, count }) => <Link key={tag} href={`/explore?q=${encodeURIComponent(tag)}`} className="rounded-xl border border-border p-3 hover:bg-secondary"><p className="text-sm font-semibold">{tag}</p><p className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? "post" : "posts"}</p></Link>)}</div>}</section>

      <section className="px-4 py-5"><div className="mb-3"><h2 className="font-serif text-base font-bold">Recent community conversations</h2><p className="text-xs text-muted-foreground">What people are talking about now.</p></div>{recent.length === 0 ? <EmptyState icon={<MessageCircle className="size-6" />} title="No conversations yet" description="Start a conversation from Home." /> : <div className="space-y-2">{recent.slice(0, 5).map((post) => <Link key={post.id} href={`/post/${post.id}`} className="block rounded-xl border border-border p-3 hover:bg-secondary"><p className="line-clamp-2 text-sm">{post.content}</p><p className="mt-1 text-xs text-muted-foreground">@{post.author.username} · {post.reply_count} replies</p></Link>)}</div>}</section>
    </div>
  )
}
