import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { PostComposer } from "@/components/post-composer"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getCurrentProfile, getHomeFeed, getSessionUser } from "@/lib/queries"
import { Compass, Globe2, Radio, Sparkles, Newspaper, PlaySquare, Users, MapPin } from "lucide-react"

const feedTabs = ["For You", "Following", "Africa", "News", "Media", "Community", "Live"]

const trending = [
  { country: "Zimbabwe", topic: "Community conversations" },
  { country: "South Africa", topic: "News & current affairs" },
  { country: "Zambia", topic: "Regional conversations" },
  { country: "Kenya", topic: "Culture & society" },
]

export default async function HomePage() {
  const user = await getSessionUser()
  const [profile, posts] = await Promise.all([getCurrentProfile(), user ? getHomeFeed(user.id) : Promise.resolve([])])

  return (
    <div className="min-h-full">
      <PageHeader title="AFRICA & BEYOND SOCIAL" subtitle="People. Places. Perspectives." />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 border-r-0 lg:border-r lg:border-border">
          <section className="border-b border-border bg-gradient-to-r from-brand-green/10 via-background to-brand-red/10 px-4 py-5 md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white shadow-sm">
                <Globe2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg">What’s happening across Africa?</h2>
                <p className="text-xs leading-5 text-muted-foreground">Share your perspective, story, photo or moment from where you are.</p>
              </div>
            </div>
            <div className="mt-4 hidden md:block">
              <PostComposer profile={profile} />
            </div>
          </section>

          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1 scrollbar-none md:px-4">
            {feedTabs.map((tab, index) => (
              <div
                key={tab}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${index === 0 ? "bg-brand-red/10 text-brand-red" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {tab === "Africa" && <Compass className="size-4" />}
                {tab === "News" && <Newspaper className="size-4" />}
                {tab === "Media" && <PlaySquare className="size-4" />}
                {tab === "Community" && <Users className="size-4" />}
                {tab === "Live" && <Radio className="size-4" />}
                {tab}
              </div>
            ))}
          </div>

          <div className="border-b border-border px-4 py-3 md:hidden">
            <PostComposer profile={profile} />
          </div>

          <FeedList
            posts={posts}
            currentUserId={user?.id ?? null}
            empty={
              <EmptyState
                icon={<Sparkles className="size-6" />}
                title="Your Africa feed is quiet"
                description="Follow people on Explore Africa, or share your first perspective to get the conversation started."
              />
            }
          />
        </div>

        <aside className="hidden space-y-4 px-4 py-5 lg:block">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="size-5 text-brand-green" />
              <h2 className="font-semibold">AFRICA TODAY</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Discover conversations from across the continent.</p>
            <div className="space-y-2">
              {trending.map((item) => (
                <Link key={item.country} href="/explore" className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{item.country}</span>
                    <span className="text-brand-red">›</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.topic}</p>
                </Link>
              ))}
            </div>
            <Link href="/explore" className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-red hover:underline">
              <MapPin className="size-4" /> Explore Africa
            </Link>
          </section>

          <section className="rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Radio className="size-5 text-brand-red" />
              <h2 className="font-semibold">AFRICA &amp; BEYOND TV</h2>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Live broadcasts, programmes and video from Africa &amp; Beyond.</p>
            <Link href="/live" className="mt-3 inline-flex rounded-full bg-brand-red px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
              Watch Live
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
