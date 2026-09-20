"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, ShieldAlert, Sparkles } from "lucide-react"

type Props = { storyId: string; onClose: () => void }

export function StoryWorkspace({ storyId, onClose }: Props) {
  const [story, setStory] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [notes, setNotes] = useState("")
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/newsroom/story?id=" + encodeURIComponent(storyId))
      .then((r) => r.json())
      .then((data) => { setStory(data.story); setRelated(data.related ?? []); setNotes(data.story?.verification_notes ?? ""); setDraft(data.story?.ai_draft ?? "") })
  }, [storyId])

  async function runVerify() {
    const response = await fetch("/api/newsroom/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storyId }) })
    if (response.ok) {
      const data = await response.json()
      setNotes(data.notes ?? "")
      setRelated(data.evidence ?? [])
      setStory((current: any) => current ? { ...current, confidence: data.evidence?.length ? "developing" : "unverified" } : current)
    }
  }

  async function generateAI() {
    const response = await fetch("/api/newsroom/ai-draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storyId }) })
    if (response.ok) {
      const data = await response.json()
      setStory(data.story)
      setDraft(data.story?.ai_draft ?? "")
    }
  }

  async function save(status?: string) {
    setSaving(true)
    const response = await fetch("/api/newsroom/story", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: storyId, verificationNotes: notes, aiDraft: draft, status }),
    })
    if (response.ok) {
      const data = await response.json()
      setStory(data.story)
    }
    setSaving(false)
  }

  if (!story) return <div className="p-8 text-sm text-muted-foreground">Loading story workspace…</div>

  return (
    <div className="space-y-5">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ArrowLeft className="size-3.5" /> Back to newsroom</button>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-bold uppercase">{story.status}</span>
          <span>{story.source_name}</span>
          {story.published_at && <span>· {new Date(story.published_at).toLocaleString()}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight">{story.title}</h1>
        <a href={story.canonical_url || story.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green"><ExternalLink className="size-3.5" /> Open original source</a>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2"><FileText className="size-5 text-brand-green" /><h2 className="font-bold">Source Material</h2></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{story.content_text || story.summary || "The source did not provide extractable article text. Open the original source for the complete material."}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2"><ShieldAlert className="size-5 text-[#9a7400]" /><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Verification & Conflicts</h2><button onClick={runVerify} className="rounded-full bg-brand-green px-3 py-1.5 text-[11px] font-semibold text-white">Cross-check sources</button></div></div>
            <p className="mt-2 text-xs text-muted-foreground">Related detected material is shown below. The editor must assess whether reports refer to the same event and whether claims conflict.</p>
            <div className="mt-4 space-y-2">
              {related.length ? related.map((item) => <a key={item.id} href={item.canonical_url || item.source_url} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 hover:bg-secondary/40"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.source_name} · {item.confidence}</p></a>) : <p className="text-sm text-muted-foreground">No related detected reports found yet.</p>}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Record what has been confirmed, what remains unverified, and any conflicts…" className="mt-4 min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2"><Sparkles className="size-5 text-brand-green" /><h2 className="font-bold">Newsroom AI Draft</h2></div>
            <p className="mt-2 text-xs text-muted-foreground">Generate a source-bound draft. It remains subject to editorial review and is never published automatically.</p><button onClick={generateAI} className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-green px-3 py-1.5 text-[11px] font-semibold text-white"><Sparkles className="size-3.5" /> Generate AI draft</button>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Newsroom AI draft will appear here…" className="mt-4 min-h-72 w-full rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Editorial Decision</h2>
            <p className="mt-2 text-xs text-muted-foreground">Save notes/draft first, then move the story to the appropriate stage.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={saving} onClick={() => save("verifying")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Verify</button>
              <button disabled={saving} onClick={() => save("draft")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Save draft</button>
              <button disabled={saving} onClick={() => save("review")} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white">Send to review</button>
              <button disabled={saving} onClick={() => save("held")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Hold</button>
              <button disabled={saving} onClick={() => save("approved")} className="rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white">Approve</button>
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
        <CheckCircle2 className="mb-2 size-5 text-brand-green" /> Publishing remains separate from approval at this stage. No story is automatically published by this workspace.
      </div>
    </div>
  )
}
