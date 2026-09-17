import Link from "next/link"
import { Globe2, MessageCircle, Radio, Tv } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { LiveEventCard } from "@/components/live-event-card"
import { LiveStatus } from "@/components/live-status"
import { getUpcomingLiveEvents } from "@/lib/live"
import { getRecentPosts, getSessionUser, searchPosts } from "@/lib/queries"

const filters = [
  { label: "All Live", query: "live" },
  { label: "Africa", query: "Africa live" },
  { label: "World", query: "World live" },
  { label: "News", query: "news live" },
  { label: "Community", query: "community live" },
]

export default async function LivePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null
  const [posts, events] = await Promise.all([
    query ? searchPosts(query, currentUserId) : getRecentPosts(currentUserId, 24),
    getUpcomingLiveEvents(6),
  ])

  const liveVideoId = process.env.NEXT_PUBLIC_LIVE_YOUTUBE_VIDEO_ID
  const liveChannelId = process.env.NEXT_PUBLIC_LIVE_YOUTUBE_CHANNEL_ID
  const liveTitle = process.env.NEXT_PUBLIC_LIVE_TITLE?.trim() || "Africa & Beyond TV — Live"
  const fallbackEventStart = process.env.NEXT_PUBLIC_LIVE_EVENT_START?.trim()
  const fallbackEventTitle = process.env.NEXT_PUBLIC_LIVE_EVENT_TITLE?.trim() || "Next Africa & Beyond live event"
  const fallbackEventLocation = process.env.NEXT_PUBLIC_LIVE_EVENT_LOCATION?.trim()

  return (
    <div>
      <PageHeader title="LIVE" subtitle="Africa & Beyond • Live broadcasts, conversations and events" />

      <section className="border-b border-border px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <Link key={item.label} href={`/live?q=${encodeURIComponent(item.query)}`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
              <Radio className="size-3.5 text-brand-red" /> {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border bg-gradient-to-br from-brand-red/10 via-background to-brand-green/10 px-4 py-6">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red"><Radio className="size-6" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Live centre</p>
            <h2 className="mt-1 font-serif text-2xl font-bold">Africa & Beyond Live</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Watch live broadcasts, find upcoming programmes and join the conversation around events happening across Africa and the world.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="flex size-2.5 rounded-full bg-brand-red" /><h2 className="font-serif text-base font-bold">Live now</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Automatic YouTube detection keeps this broadcast window current.</p>
          </div>
          <span className="hidden rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:inline-flex">YouTube Live</span>
        </div>
        <LiveStatus fallbackVideoId={liveVideoId} channelId={liveChannelId} fallbackTitle={liveTitle} />
      </section>

      <section className="grid gap-3 border-b border-border px-4 py-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <Tv className="size-5 text-brand-red" />
          <h3 className="mt-3 text-sm font-bold">Africa & Beyond TV</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Your broadcast destination for news, programmes, interviews, conferences and special events.</p>
          <Link href="/media" className="mt-3 inline-flex text-xs font-semibold text-brand-red">Open Media</Link>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <Radio className="size-5 text-brand-green" />
          <h3 className="mt-3 text-sm font-bold">Broadcast status</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">The platform checks the connected YouTube channel automatically and changes the Live Now window when a broadcast is detected.</p>
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="size-4 text-brand-green" />
          <div><h2 className="font-serif text-base font-bold">Upcoming events</h2><p className="text-xs text-muted-foreground">Scheduled programmes stored in the Africa & Beyond Live database</p></div>
        </div>
        {events.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => <LiveEventCard key={event.id} title={event.title} start={event.start_at} location={event.location ?? undefined} />)}
          </div>
        ) : (
          <LiveEventCard title={fallbackEventTitle} start={fallbackEventStart} location={fallbackEventLocation} />
        )}
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="size-4 text-brand-red" />
          <div><h2 className="font-serif text-base font-bold">Live conversations</h2><p className="text-xs text-muted-foreground">Social posts and discussions related to live events</p></div>
        </div>
        <FeedList posts={posts} currentUserId={currentUserId} empty={<EmptyState icon={<Radio className="size-6" />} title="No live conversations yet" description="Live broadcasts and event discussions will appear here when people start sharing them." />} />
      </section>

      <section className="px-4 py-5">
        <div className="flex items-center gap-2"><Globe2 className="size-4 text-brand-green" /><div><h2 className="font-serif text-base font-bold">Live across Africa & Beyond</h2><p className="text-xs text-muted-foreground">Explore live conversations from Africa and the wider world.</p></div></div>
        <Link href="/explore" className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary">Explore Africa & Beyond</Link>
      </section>
    </div>
  )
}
