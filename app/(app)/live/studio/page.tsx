import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { LiveStudio } from "@/components/live-studio"
import { getSessionUser } from "@/lib/queries"

function isOfficialTv(email?: string | null) {
  if (!email) return false
  const allowed = (process.env.LIVE_ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

export default async function LiveStudioPage() {
  const user = await getSessionUser()
  if (!user) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-red" />
        <h1 className="mt-4 font-serif text-xl font-bold">Live Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Sign in to create and manage a live room.</p>
        <Link href="/auth/login" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary">Sign in</Link>
      </div>
    )
  }

  const officialTv = isOfficialTv(user.email)

  return (
    <div className="px-4 py-5">
      <Link href="/live" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to Live</Link>
      <div className="mt-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Live Studio</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">Create your live room</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Camera, microphone, screen sharing, scenes, overlays, audience controls and publishing for creators. Africa & Beyond TV has the additional YouTube broadcast connection.</p>
      </div>
      <LiveStudio officialTv={officialTv} />
    </div>
  )
}
