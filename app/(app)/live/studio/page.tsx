import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { LiveStudio } from "@/components/live-studio"
import { getSessionUser } from "@/lib/queries"

function isLiveAdmin(email?: string | null) {
  if (!email) return false
  const allowed = (process.env.LIVE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

export default async function LiveStudioPage() {
  const user = await getSessionUser()

  if (!isLiveAdmin(user?.email)) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-red" />
        <h1 className="mt-4 font-serif text-xl font-bold">Live Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">This studio is restricted to configured Africa & Beyond Live administrators.</p>
        <Link href="/live" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary">Back to Live</Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <Link href="/live/manage" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to Control Room</Link>
      <div className="mt-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Africa & Beyond Studio</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">Live Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Prepare the show, preview the presenter feed, select destinations and configure the audience experience.</p>
      </div>
      <LiveStudio />
    </div>
  )
}
