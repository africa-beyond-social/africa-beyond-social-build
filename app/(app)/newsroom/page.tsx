import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, Clock3, FileText, Globe2, ShieldAlert, Sparkles, Rss, ArrowRight } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

const statuses = [
  ["incoming", "Incoming", Clock3],
  ["verifying", "Verifying", ShieldAlert],
  ["ready_for_editor", "Ready for Editor", FileText],
  ["published", "Published", CheckCircle2],
  ["held", "Held", Clock3],
  ["rejected", "Rejected", ShieldAlert],
] as const

function isEditor(email?: string | null) {
  return Boolean(
    email &&
      (process.env.NEWSROOM_EDITOR_EMAILS || process.env.LIVE_ADMIN_EMAILS || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(email.toLowerCase()),
  )
}

export default async function NewsroomPage() {
  const user = await getSessionUser()
  if (!isEditor(user?.email)) redirect("/")

  const admin = createAdminClient()
  const [{ data: sources }, { data: stories }] = await Promise.all([
    admin.from("newsroom_sources").select("id,name,url,feed_url,source_type,active,last_checked_at").order("created_at", { ascending: false }),
    admin.from("newsroom_stories").select("id,headline,status,verification_state,original_url,detected_at").order("detected_at", { ascending: false }).limit(50),
  ])

  const counts = Object.fromEntries(statuses.map(([key]) => [key, stories?.filter((s) => s.status === key).length ?? 0]))

  return (
    <div className="min-h-full">
      <header className="border-b border-border px-4 py-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">WIGOD</p>
            <h1 className="mt-1 font-serif text-2xl font-bold">NEWSROOM</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Source Scout, story detection, verification and editor review in one workspace.
            </p>
          </div>
          <Link href="/" className="rounded-full border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary">Back to WIGOD</Link>
        </div>
      </header>

      <main className="space-y-5 px-4 py-5 md:px-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-brand-green"><Rss className="size-4" /><span className="text-xs font-bold uppercase">Sources</span></div>
            <p className="mt-2 text-2xl font-bold">{sources?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">{sources?.filter((s) => s.active).length ?? 0} active</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-brand-red"><Sparkles className="size-4" /><span className="text-xs font-bold uppercase">Detected</span></div>
            <p className="mt-2 text-2xl font-bold">{stories?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Latest 50 stories</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-brand-green"><Globe2 className="size-4" /><span className="text-xs font-bold uppercase">Pipeline</span></div>
            <p className="mt-2 text-sm font-bold">SOURCE → DETECT → VERIFY → EDIT</p>
            <p className="text-xs text-muted-foreground">Human approval remains required.</p>
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {statuses.map(([key, label, Icon]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <Icon className="size-4 text-brand-green" />
              <p className="mt-2 text-xs font-semibold">{label}</p>
              <p className="text-xl font-bold">{counts[key] ?? 0}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold">SOURCE SCOUT</h2>
              <p className="text-xs text-muted-foreground">Add approved RSS feeds and run a controlled detection pass.</p>
            </div>
            <form action="/api/newsroom/scout" method="post">
              <button className="rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-white hover:opacity-90">RUN SCOUT</button>
            </form>
          </div>

          <form action="/api/newsroom/sources" method="post" className="mt-4 grid gap-2 md:grid-cols-[1fr_1.4fr_1.4fr_auto]">
            <input name="name" required placeholder="Source name" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            <input name="url" type="url" required placeholder="Source website URL" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            <input name="feed_url" type="url" placeholder="RSS feed URL (optional)" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            <button className="rounded-xl border border-brand-green px-4 py-2.5 text-sm font-bold text-brand-green hover:bg-brand-green/5">ADD SOURCE</button>
          </form>

          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {(sources ?? []).map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{source.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{source.feed_url || source.url}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-green/10 px-2 py-1 text-[10px] font-bold text-brand-green">{source.active ? "ACTIVE" : "OFF"}</span>
              </div>
            ))}
            {!sources?.length && <p className="px-3 py-5 text-sm text-muted-foreground">No newsroom sources configured yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold">STORY DESK</h2>
              <p className="text-xs text-muted-foreground">Detected stories move through verification before editor approval.</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Latest first</span>
          </div>
          <div className="space-y-2">
            {(stories ?? []).map((story) => (
              <Link key={story.id} href={"/newsroom/" + story.id} className="block rounded-xl border border-border p-3 hover:bg-secondary/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{story.headline}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{story.verification_state.toUpperCase()} · {story.status.replaceAll("_", " ").toUpperCase()}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {!stories?.length && <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Run Source Scout to detect the first stories.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
