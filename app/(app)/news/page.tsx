import Link from "next/link"
import { Globe2, Newspaper, Radio, TrendingUp, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { SearchBar } from "@/components/search-bar"
import { getRecentPosts, getSessionUser, getTrendingHashtags, searchPosts } from "@/lib/queries"

const sections = [
  { label: "Africa", query: "Africa", icon: Globe2 },
  { label: "Zimbabwe", query: "Zimbabwe", icon: Newspaper },
  { label: "Southern Africa", query: "Southern Africa", icon: Globe2 },
  { label: "World", query: "World", icon: Globe2 },
  { label: "Business", query: "business", icon: TrendingUp },
  { label: "Media", query: "media", icon: Video },
  { label: "Live", query: "live", icon: Radio },
]

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null
  const [posts, trending] = await Promise.all([
    query ? searchPosts(query, currentUserId) : getRecentPosts(currentUserId, 40),
    getTrendingHashtags(8),
  ])

  return (
    <div>
      <PageHeader title="NEWS" subtitle="Africa & Beyond • News, perspectives and public conversation" />
      <section className="border-b border-border px-4 py-4">
        <SearchBar initialQuery={query} />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {sections.map(({ label, query: sectionQuery, icon: Icon }) => (
            <Link key={label} href={`/news?q=${encodeURIComponent(sectionQuery)}`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"><Icon className="size-3.5 text-brand-green" /> {label}</Link>
          ))}
        </div>
      </section>
      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-5">
        <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Newspaper className="size-5" /></div><div><h2 className="font-serif text-xl font-bold">Africa & Beyond News</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">A social news hub connecting news conversations from Africa with stories, perspectives and public discussion from around the world.</p></div></div>
      </section>
      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Trending now</h2><p className="text-xs text-muted-foreground">Topics people are discussing on the platform</p></div><TrendingUp className="size-4 text-muted-foreground" /></div>
        {trending.length === 0 ? <p className="text-sm text-muted-foreground">No trending topics yet.</p> : <div className="grid gap-2 sm:grid-cols-2">{trending.map(({ tag, count }) => <Link key={tag} href={`/news?q=${encodeURIComponent(tag)}`} className="rounded-xl border border-border p-3 hover:bg-secondary"><p className="text-sm font-semibold">{tag}</p><p className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? "post" : "posts"}</p></Link>)}</div>}
      </section>
      <section className="px-4 py-5"><div className="mb-3"><h2 className="font-serif text-base font-bold">{query ? `News conversations for “${query}”` : "Latest news conversations"}</h2><p className="text-xs text-muted-foreground">Posts shared by people across Africa & Beyond</p></div><FeedList posts={posts} currentUserId={currentUserId} empty={<EmptyState icon={<Newspaper className="size-6" />} title="No news conversations yet" description="News stories and public conversations will appear here as people share them." />} /></section>
    </div>
  )
}
