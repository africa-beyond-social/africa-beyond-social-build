import Link from "next/link"

import { PostComposer } from "@/components/post-composer"
import { FeedList, EmptyState } from "@/components/feed-list"
import { getCurrentProfile, getHomeFeed, getSessionUser } from "@/lib/queries"
import { Compass, Globe2, Radio, Sparkles, Newspaper, PlaySquare, Users, MapPin, Store, Megaphone, Clapperboard } from "lucide-react"

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
    <div className="min-h-full overflow-x-hidden">
      <header className="border-b border-border bg-background px-4 py-5 md:px-6 md:py-7">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="text-2xl font-extrabold tracking-tight text-brand-green sm:text-3xl">WIGOD</div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-xs font-bold uppercase tracking-wider sm:text-sm">
            <span className="text-brand-red">PEOPLE.</span>
            <span className="text-[#d4a017]">PLACES.</span>
            <span className="text-foreground">PERSPECTIVES.</span>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 border-r-0 lg:border-r lg:border-border">
          <section className="border-b border-border bg-gradient-to-r from-brand-green/10 via-background to-brand-red/10 px-4 py-5 md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white shadow-sm">
                <Globe2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg">What’s happening Around The World?</h2>
                <p className="text-xs leading-5 text-muted-foreground">Discover and share perspectives from wherever you are.</p>
              </div>
            </div>
          </section>

          <section className="border-b border-border px-4 py-4 md:px-6">
            <PostComposer profile={profile} placeholder="What’s happening?" />
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

          <FeedList
            posts={posts}
            currentUserId={user?.id ?? null}
            empty={
              <EmptyState
                icon={<Sparkles className="size-6" />}
                title="Your WIGOD feed is quiet"
                description="Follow people on Explore, or share your first perspective to get the conversation started."
              />
            }
          />
        </div>

        <aside className="hidden space-y-4 px-4 py-5 lg:block">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold tracking-wide">WIGOD</h2>
            <div className="space-y-2">
              <Link href="/marketplace" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold transition-colors hover:bg-secondary">
                <Store className="size-5 text-brand-green" /> MARKETPLACE
              </Link>
              <Link href="/advertise" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold transition-colors hover:bg-secondary">
                <Megaphone className="size-5 text-brand-red" /> ADVERTISE
              </Link>
              <Link href="/live/studio" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold transition-colors hover:bg-secondary">
                <Clapperboard className="size-5 text-brand-green" /> CREATOR STUDIO
              </Link>
              <Link href="/explore" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold transition-colors hover:bg-secondary">
                <MapPin className="size-5 text-[#d4a017]" /> EXPLORE THE WORLD
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="size-5 text-brand-green" />
              <h2 className="font-semibold">Around the World</h2>
            </div>
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
          </section>

          <section className="rounded-2xl border border-brand-red/20 bg-brand-red/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Radio className="size-5 text-brand-red" />
              <h2 className="font-semibold">WIGOD LIVE</h2>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Live broadcasts, programmes and video on WIGOD.</p>
            <Link href="/live" className="mt-3 inline-flex rounded-full bg-brand-red px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
              Watch Live
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
