import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { PilotBroadcast } from "@/components/pilot-broadcast"
import { getSessionUser } from "@/lib/queries"

function admin(email?: string | null) {
  return Boolean(email && (process.env.LIVE_ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).includes(email.toLowerCase()))
}

export default async function WIGODPilotPage() {
  const user = await getSessionUser()

  if (!admin(user?.email)) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-red" />
        <h1 className="mt-4 text-xl font-bold">WIGOD Broadcast Pilot</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">This pilot is restricted to configured Live administrators.</p>
        <Link href="/live" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold">Back to Live</Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <Link href="/live/studio" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to Studio
      </Link>
      <div className="mt-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD Broadcast Pilot</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">Transport test</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">The first proof of the new broadcast path, separate from the existing LiveKit implementation.</p>
      </div>
      <PilotBroadcast />
    </div>
  )
}
