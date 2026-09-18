import Link from "next/link"
import { Globe2, MessageCircle, Radio, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FeedList, EmptyState } from "@/components/feed-list"
import { LiveEventCard } from "@/components/live-event-card"
import { LiveStatus } from "@/components/live-status"
import { getUpcomingLiveEvents } from "@/lib/live"
import { getRecentPosts, getSessionUser, searchPosts } from "@/lib/queries"

const filters = [
  ["All Live", "live"],
  ["Africa", "Africa live"],
  ["World", "World live"],
  ["News", "news live"],
  ["Community", "community live"],
]

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ""
  const user = await getSessionUser()
  const currentUserId = user?.id ?? null

  const [posts, events] = await Promise.all([
    query
      ? searchPosts(query, currentUserId)
      : getRecentPosts(currentUserId, 24),
    getUpcomingLiveEvents(6),
  ])

  const channelId = process.env.NEXT_PUBLIC_LIVE_YOUTUBE_CHANNEL_ID
  const title =
    process.env.NEXT_PUBLIC_LIVE_TITLE?.trim() || "WIGOD Live"

  return (
    <div>
      <PageHeader
        title="WIGOD LIVE"
        subtitle="Live broadcasts, programmes and conversations on WIGOD"
      />

      <section className="border-b border-border px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(([label, value]) => (
            <Link
              key={label}
              href={"/live?q=" + encodeURIComponent(value)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              <Radio className="size-3.5 text-brand-red" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-border bg-gradient-to-br from-brand-red/10 via-background to-brand-green/10 px-4 py-6">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <Radio className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
              WIGOD Live
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold">
              Broadcast. Connect. Participate.
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              Watch live programmes, discover upcoming broadcasts and join the
              conversation without leaving WIGOD.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-red" />
              <h2 className="font-serif text-base font-bold">Live now</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Connected broadcasts appear here automatically.
            </p>
          </div>
          <Link
            href="/live/studio"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-3 py-2 text-xs font-bold text-white"
          >
            <Video className="size-3.5" />
            Live Studio
          </Link>
        </div>
        <LiveStatus channelId={channelId} fallbackTitle={title} />
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3">
          <h2 className="font-serif text-base font-bold">Upcoming Live</h2>
          <p className="text-xs text-muted-foreground">
            Scheduled broadcasts and programmes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.length > 0 ? (
            events.map((event) => (
              <LiveEventCard
                key={event.id}
                title={event.title}
                start={event.start_at}
                location={event.location ?? undefined}
              />
            ))
          ) : (
            <LiveEventCard title="No upcoming broadcast scheduled" />
          )}
        </div>
      </section>

      <section className="border-b border-border px-4 py-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="size-4 text-brand-red" />
          <div>
            <h2 className="font-serif text-base font-bold">
              Live conversations
            </h2>
            <p className="text-xs text-muted-foreground">
              Posts and discussions around live programmes.
            </p>
          </div>
        </div>
        <FeedList
          posts={posts}
          currentUserId={currentUserId}
          empty={
            <EmptyState
              icon={<Radio className="size-6" />}
              title="No live conversations yet"
              description="Conversations will appear here as people post about live programmes."
            />
          }
        />
      </section>

      <section className="px-4 py-5">
        <div className="flex items-center gap-2">
          <Globe2 className="size-4 text-brand-green" />
          <div>
            <h2 className="font-serif text-base font-bold">
              Live across Africa & Beyond
            </h2>
            <p className="text-xs text-muted-foreground">
              Discover people, places and perspectives around live events.
            </p>
          </div>
        </div>
        <Link
          href="/explore"
          className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
        >
          Explore
        </Link>
      </section>
    </div>
  )
}
