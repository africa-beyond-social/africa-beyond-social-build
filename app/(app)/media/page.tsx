import Link from "next/link"
import { PlaySquare, Video, Image as ImageIcon, Radio } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getRecentPosts, getSessionUser } from "@/lib/queries"

export default async function MediaPage() {
  const user = await getSessionUser()
  const posts = await getRecentPosts(user?.id ?? null, 30)
  const mediaPosts = posts.filter((post) => Boolean(post.image_url))

  return (
    <div>
      <PageHeader title="MEDIA" subtitle="Photos, video and live moments from the community" />
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 scrollbar-none">
        {[
          ["All Media", "/media"],
          ["Video", "/media?type=video"],
          ["Photos", "/media?type=photos"],
          ["Live", "/live"],
        ].map(([label, href], index) => (
          <Link key={label} href={href} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${index === 0 ? "bg-brand-red/10 text-brand-red" : "text-muted-foreground hover:bg-secondary"}`}>
            {label}
          </Link>
        ))}
      </div>
      <section className="grid gap-3 border-b border-border p-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border p-4"><Video className="size-5 text-brand-green" /><h2 className="mt-3 font-semibold">Short video</h2><p className="mt-1 text-xs text-muted-foreground">A foundation for creator video and short-form moments.</p></div>
        <div className="rounded-2xl border border-border p-4"><ImageIcon className="size-5 text-brand-red" /><h2 className="mt-3 font-semibold">Photos</h2><p className="mt-1 text-xs text-muted-foreground">Discover visual stories shared by people across the platform.</p></div>
        <Link href="/live" className="rounded-2xl border border-border p-4 transition-colors hover:bg-secondary"><Radio className="size-5 text-brand-red" /><h2 className="mt-3 font-semibold">Live</h2><p className="mt-1 text-xs text-muted-foreground">Watch live rooms and Africa & Beyond TV broadcasts.</p></Link>
      </section>
      <section>
        <div className="flex items-center gap-2 px-4 py-4"><PlaySquare className="size-5 text-brand-green" /><div><h2 className="font-serif font-bold">Community media</h2><p className="text-xs text-muted-foreground">Recent posts with visual media</p></div></div>
        <FeedList posts={mediaPosts} currentUserId={user?.id ?? null} empty={<EmptyState icon={<PlaySquare className="size-6" />} title="No media yet" description="Photos and video shared by the community will appear here." />} />
      </section>
    </div>
  )
}
