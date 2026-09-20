import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CheckCircle2, ExternalLink, FileText, ShieldAlert } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/queries"

function isEditor(email?: string | null) {
  return Boolean(email && (process.env.NEWSROOM_EDITOR_EMAILS || process.env.LIVE_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).includes(email.toLowerCase()))
}

export default async function NewsroomStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!isEditor(user?.email)) redirect("/")
  const { id } = await params
  const admin = createAdminClient()
  const { data: story } = await admin.from("newsroom_stories").select("*").eq("id", id).maybeSingle()
  if (!story) notFound()
  const { data: sources } = await admin.from("newsroom_story_sources").select("source_title,source_url,source_published_at").eq("story_id", id)
  const { data: draft } = await admin.from("newsroom_drafts").select("*").eq("story_id", id).maybeSingle()

  return (
    <div className="min-h-full">
      <header className="border-b border-border px-4 py-5 md:px-6">
        <Link href="/newsroom" className="text-xs font-semibold text-brand-green hover:underline">← NEWSROOM</Link>
        <h1 className="mt-3 max-w-3xl font-serif text-2xl font-bold">{story.headline}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
          <span className="rounded-full bg-brand-green/10 px-2 py-1 text-brand-green">{story.verification_state.toUpperCase()}</span>
          <span className="rounded-full bg-brand-red/10 px-2 py-1 text-brand-red">{story.status.replaceAll("_", " ").toUpperCase()}</span>
        </div>
      </header>
      <main className="space-y-5 px-4 py-5 md:px-6">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 text-brand-green" /> Verification</h2>
          <p className="mt-2 text-sm text-muted-foreground">Treat this item as reported until additional evidence is checked. Do not publish an unverified claim as fact.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(sources ?? []).map((source) => (
              <a key={source.source_url} href={source.source_url} target="_blank" rel="noreferrer" className="rounded-xl border border-border p-3 hover:bg-secondary/50">
                <p className="text-sm font-semibold">{source.source_title || "Source"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{source.source_url}</p>
                <ExternalLink className="mt-2 size-4 text-brand-green" />
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-brand-green" /> Editorial desk</h2>
          <form action="/api/newsroom/story" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="story_id" value={story.id} />
            <textarea name="headline" defaultValue={draft?.headline || story.headline} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold" rows={2} />
            <textarea name="lead" defaultValue={draft?.lead || story.summary || ""} placeholder="Lead" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" rows={3} />
            <textarea name="body" defaultValue={draft?.body || ""} placeholder="Article body / editor draft" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" rows={10} />
            <textarea name="background" defaultValue={draft?.background || ""} placeholder="Background / context" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" rows={4} />
            <textarea name="editor_notes" defaultValue={draft?.editor_notes || ""} placeholder="Editor notes / verification gaps" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" rows={3} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="verification_state" defaultValue={story.verification_state} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                <option value="confirmed">CONFIRMED</option>
                <option value="reported">REPORTED</option>
                <option value="unconfirmed">UNCONFIRMED</option>
                <option value="conflicting">CONFLICTING</option>
              </select>
              <select name="status" defaultValue={story.status} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                <option value="incoming">INCOMING</option>
                <option value="verifying">VERIFYING</option>
                <option value="ready_for_editor">READY FOR EDITOR</option>
                <option value="published">PUBLISHED</option>
                <option value="held">HELD</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold text-white hover:opacity-90"><CheckCircle2 className="size-4" /> SAVE EDITORIAL UPDATE</button>
          </form>
        </section>
      </main>
    </div>
  )
}
