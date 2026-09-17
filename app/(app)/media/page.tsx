import Link from "next/link"
import { Camera, Globe2, Image as ImageIcon, Newspaper, Radio, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { SearchBar } from "@/components/search-bar"
import { getRecentPosts, getSessionUser, searchPosts } from "@/lib/queries"

const filters = [
  { label: "All Media", query: "" },
  { label: "Africa", query: "Africa" },
  { label: "World", query: "World" },
  { label: "Photos", query: "photo" },
  { label: "Video", query: "video" },
  { label: "Live", query: "live" },
]

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null
  const posts = query ? await searchPosts(query, currentUserId) : await getRecentPosts(currentUserId, 40)
  const mediaPosts = posts.filter((post) => Boolean(post.image_url) || /\b(photo|video|live|watch|pictured|image|broadcast)\b/i.test(post.content))

  return (
    <div>
      <PageHeader title="MEDIA" subtitle="Africa & Beyond • Photos, video, broadcasts and visual stories" />
      <section className="border-b border-border px-4 py-4">
        <SearchBar initialQuery={query} />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map(({ label, query: filterQuery }) => (
            <Link key={label} href={filterQuery ? `/media?q=${encodeURIComponent(filterQuery)}` : "/media"} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
              {label === "Photos" ? <ImageIcon className="size-3.5 text-brand-green" /> : label === "Video" ? <Video className="size-3.5 text-brand-green" /> : label === "Live" ? <Radio className="size-3.5 text-brand-green" /> : <Globe2 className="size-3.5 text-brand-green" />} {label}
            </Link>
          ))}
        </div>
      </section>
      <section className="border-b border-border bg-gradient-to-br from-brand-green/10 via-background to-brand-red/5 px-4 py-5">
        <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Camera className="size-5" /></div><div><h2 className="font-serif text-xl font-bold">Africa & Beyond Media</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">A visual discovery space for photographs, videos, broadcasts and moments shared from Africa and around the world.</p></div></div>
      </section>
      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-serif text-base font-bold">Featured media</h2><p className="text-xs text-muted-foreground">Visual posts from the Africa & Beyond community</p></div><Video className="size-4 text-muted-foreground" /></div>
        {mediaPosts.length === 0 ? <EmptyState icon={<ImageIcon className="size-6" />} title="No media yet" description="Photos and visual stories will appear here as members share them." /> : <div className="grid gap-3 sm:grid-cols-2">{mediaPosts.slice(0, 6).map((post) => <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card">{post.image_url ? <img src={post.image_url} alt="" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-secondary"><Video className="size-8 text-muted-foreground" /></div>}<div className="p-3"><p className="line-clamp-3 text-sm leading-5">{post.content}</p><p className="mt-2 text-xs text-muted-foreground">@{post.author.username}</p></div></article>)}</div>}
      </section>
      <section className="px-4 py-5"><div className="mb-3"><h2 className="font-serif text-base font-bold">Media conversations</h2><p className="text-xs text-muted-foreground">Discuss, repost and react to visual stories</p></div><FeedList posts={mediaPosts} currentUserId={currentUserId} empty={<EmptyState icon={<Newspaper className="size-6" />} title="No media conversations yet" description="Media posts will appear here when they are shared." />} /></section>
    </div>
  )
}
