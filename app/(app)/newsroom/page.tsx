import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getSessionUser } from "@/lib/queries"
import { NewsroomDashboard } from "@/components/newsroom-dashboard"

function admin(email?: string | null) {
  return Boolean(
    email &&
      (process.env.LIVE_ADMIN_EMAILS || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(email.toLowerCase()),
  )
}

export default async function NewsroomPage() {
  const user = await getSessionUser()

  if (!admin(user?.email)) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-red" />
        <h1 className="mt-4 text-xl font-bold">WIGOD Newsroom</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          This newsroom is restricted to configured editorial administrators.
        </p>
        <Link href="/" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold">
          Back to WIGOD
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft className="size-3.5" /> Back to WIGOD
      </Link>
      <div className="mb-6 mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">WIGOD Newsroom</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">Source Scout & Editorial Desk</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Detect, verify, prepare and review stories before they enter the publishing workflow.
        </p>
      </div>
      <NewsroomDashboard />
    </div>
  )
}
