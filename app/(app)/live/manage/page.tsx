import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { WigodLiveStudio } from "@/components/wigod-live-studio"
import { getUpcomingLiveEvents } from "@/lib/live"
import { getSessionUser } from "@/lib/queries"

function isLiveAdmin(email?: string | null) {
  if (!email) return false
  const allowed = (process.env.LIVE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

export default async function LiveManagePage() {
  const user = await getSessionUser()
  if (!isLiveAdmin(user?.email)) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-red" />
        <h1 className="mt-4 font-serif text-xl font-bold">WIGOD Live Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">This creator workspace is restricted to configured WIGOD Live administrators.</p>
        <Link href="/live" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary">Back to WIGOD Live</Link>
      </div>
    )
  }

  const events = await getUpcomingLiveEvents(20)

  return (
    <div className="px-4 py-5">
      <Link href="/live" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to WIGOD Live</Link>
      <div className="mt-5 mb-6"><p className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD creator tools</p><h1 className="mt-1 font-serif text-2xl font-bold">WIGOD Live Studio</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create, prepare and publish live broadcasts. Your Studio feed can be prepared for WIGOD, YouTube, Facebook and TikTok destinations.</p></div>
      <WigodLiveStudio />
      <section className="mt-8 border-t border-border pt-6"><h2 className="font-serif text-lg font-bold">Scheduled WIGOD events</h2><p className="mt-1 text-xs text-muted-foreground">Existing scheduled programme records remain available below the Studio.</p><div className="mt-3">{events.length === 0 ? <p className="rounded-2xl border border-border p-5 text-sm text-muted-foreground">No manually scheduled events.</p> : <div className="space-y-2">{events.map((event) => <div key={event.id} className="rounded-2xl border border-border p-4"><p className="text-sm font-bold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.start_at).toLocaleString()} {event.location ? `• ${event.location}` : ""}</p></div>)}</div>}</div></section>
    </div>
  )
}
