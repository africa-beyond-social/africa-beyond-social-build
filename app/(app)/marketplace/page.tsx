import Link from "next/link"
import { ArrowRight, Camera, Heart, MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag, Sparkles, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const categories = ["All", "Vehicles", "Property", "Phones & Electronics", "Fashion", "Home", "Agriculture", "Services"]
const demoListings = [
  { title: "Marketplace is ready for listings", price: "—", location: "Africa & Beyond", category: "Coming soon", icon: ShoppingBag },
  { title: "Sell with photos and short video", price: "—", location: "Anywhere", category: "Creator tools", icon: Video },
  { title: "Message sellers directly", price: "—", location: "Global", category: "Community", icon: MessageCircle },
]

export default function MarketplacePage() {
  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Buy, sell and discover from people across Africa & Beyond." />
      <div className="space-y-5 px-4 py-5 md:px-6">
        <section className="rounded-2xl border border-border bg-gradient-to-r from-brand-green/10 via-background to-brand-red/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-green">Marketplace</p>
              <h1 className="mt-1 font-serif text-2xl font-bold">Trade with your community</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create listings with multiple photos, short video, price, location and condition. Buyers can save, share, report or message a seller.</p>
            </div>
            <Link href="#create" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold text-white">Create listing <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[{ icon: Camera, text: "Photos + short video" }, { icon: MessageCircle, text: "Message seller" }, { icon: ShieldCheck, text: "Report & safety tools" }].map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2.5 text-xs font-semibold"><Icon className="size-4 text-brand-red" />{text}</div>)}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Search Marketplace" className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" /></div>
          <button type="button" className="rounded-xl border border-border px-4 py-3 text-xs font-bold">Filters</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{categories.map((category, i) => <button key={category} type="button" className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${i === 0 ? "border-brand-green bg-brand-green text-white" : "border-border bg-background"}`}>{category}</button>)}</div>

        <section id="create" className="rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2"><Sparkles className="size-5 text-brand-red" /><h2 className="text-base font-bold">Create a listing</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">The listing workflow is being built into the social composer. Monetisation is intentionally OFF at launch.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[["Title", "What are you selling?"], ["Price", "Price and currency"], ["Location", "City, country"], ["Condition", "New or used"]].map(([label, placeholder]) => <label key={label} className="text-xs font-semibold">{label}<input placeholder={placeholder} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none" /></label>)}
          </div>
          <button type="button" className="mt-4 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold text-white">Continue listing</button>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg font-bold">Marketplace</h2><span className="text-xs text-muted-foreground">Monetisation: OFF</span></div>
          <div className="grid gap-3 md:grid-cols-3">{demoListings.map(({ title, price, location, category, icon: Icon }) => <article key={title} className="rounded-2xl border border-border bg-card p-4"><div className="flex aspect-video items-center justify-center rounded-xl bg-secondary"><Icon className="size-8 text-muted-foreground" /></div><p className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-red">{category}</p><h3 className="mt-1 text-sm font-bold">{title}</h3><p className="mt-2 text-sm font-semibold">{price}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5" /> {location}</p><div className="mt-3 flex gap-2"><button type="button" className="flex-1 rounded-full border border-border py-2 text-xs font-semibold"><Heart className="mx-auto size-4" /></button><button type="button" className="flex-1 rounded-full border border-border py-2 text-xs font-semibold">Message</button></div></article>)}</div>
        </section>
      </div>
    </div>
  )
}
