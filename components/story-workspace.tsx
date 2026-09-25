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
  const [article, setArticle] = useState<any>(null)
  const [articleBusy, setArticleBusy] = useState(false)
  const [articleError, setArticleError] = useState("")
  const [socialBusy, setSocialBusy] = useState(false)
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState("")
  const [schedule, setSchedule] = useState({ title: "", startAt: "", endAt: "", category: "news", streamUrl: "", description: "" })
  const [intelligenceBusy, setIntelligenceBusy] = useState(false)
  const [intelligenceMessage, setIntelligenceMessage] = useState("")

  useEffect(() => {
    fetch("/api/newsroom/story?id=" + encodeURIComponent(storyId))
      .then((r) => r.json())
      .then((data) => { setStory(data.story); setRelated(data.related ?? []); setNotes(data.story?.verification_notes ?? ""); setDraft(data.story?.ai_draft ?? "") })
  }, [storyId])

  useEffect(() => { loadArticle() }, [storyId])

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

  async function runIntelligence() {
    setIntelligenceBusy(true)
    setIntelligenceMessage("")
    try {
      const response = await fetch("/api/newsroom/intelligence", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Newsroom intelligence failed")
      const refreshed = await fetch("/api/newsroom/story?id=" + encodeURIComponent(storyId), { cache: "no-store" })
      const refreshedData = await refreshed.json()
      if (refreshed.ok) setStory(refreshedData.story)
      setIntelligenceMessage("Intelligence updated for " + String(data.processed || 0) + " newsroom stories.")
    } catch (error) {
      setIntelligenceMessage(error instanceof Error ? error.message : "Unable to update newsroom intelligence.")
    } finally {
      setIntelligenceBusy(false)
    }
  }

  async function publish() {
    const response = await fetch("/api/newsroom/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storyId }) })
    if (response.ok) { const data = await response.json(); setStory((current: any) => current ? { ...current, status: "published" } : current) }
  }

  async function loadArticle() {
    try {
      setArticleError("")
      const response = await fetch("/api/newsroom/article?id=" + encodeURIComponent(storyId))
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setArticle(data.article ?? null)
      } else {
        setArticleError(String(data.error || "Article production is not available yet."))
      }
    } catch {
      setArticleError("Could not connect to the article production service.")
    }
  }

  async function createArticle() {
    setArticleBusy(true)
    setArticleError("")
    try {
      const response = await fetch("/api/newsroom/article", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storyId }) })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setArticle(data.article)
      } else {
        setArticleError(String(data.error || "Article production failed."))
      }
    } catch {
      setArticleError("Could not connect to the article production service.")
    } finally {
      setArticleBusy(false)
    }
  }

  async function publishWebsite() {
    if (!article) return
    setArticleBusy(true)
    const response = await fetch("/api/newsroom/publish-website", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: article.id, status: "published" }) })
    if (response.ok) { const data = await response.json(); setArticle((current: any) => current ? { ...current, website_status: "published", website_url: data.url } : current) }
    setArticleBusy(false)
  }

  async function saveArticle() {
    if (!article) return
    setArticleBusy(true)
    const response = await fetch("/api/newsroom/article", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: article.id, title: article.title, dek: article.dek, bodyHtml: article.body_html, seoTitle: article.seo_title, seoDescription: article.seo_description, category: article.category, tags: article.tags }) })
    if (response.ok) { const data = await response.json(); setArticle(data.article) }
    setArticleBusy(false)
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

      <div className="rounded-2xl border-2 border-brand-green/20 bg-brand-green/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Newsroom Intelligence</p>
            <h2 className="mt-1 text-lg font-bold">Editorial intelligence for this story</h2>
            <p className="mt-1 text-xs text-muted-foreground">The system assesses corroboration, verification risk, duplicates, trend signals and the appropriate editorial route. The editor remains in control.</p>
          </div>
          <button onClick={runIntelligence} disabled={intelligenceBusy} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{intelligenceBusy ? "Analysing…" : "Run intelligence"}</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Verification score</p><p className="mt-1 text-lg font-bold">{story.verification_score ?? 0}/100</p></div>
          <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Independent sources</p><p className="mt-1 text-lg font-bold">{story.independent_source_count ?? 0}</p></div>
          <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Trending score</p><p className="mt-1 text-lg font-bold">{story.trending_score ?? 0}</p></div>
          <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Route</p><p className="mt-1 text-sm font-bold">{story.editorial_route === "automated_review" ? "Automated review" : "Human review"}</p></div>
          <div className="rounded-xl bg-background p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Status</p><p className="mt-1 text-sm font-bold">{story.automated_review_ready ? "Review-ready" : "Needs checks"}</p></div>
        </div>
        {Array.isArray(story.editorial_watchpoints) && story.editorial_watchpoints.length > 0 && <div className="mt-4 rounded-xl border border-[#d4a017]/30 bg-[#d4a017]/5 p-3"><p className="text-xs font-bold">Editorial watchpoints</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{story.editorial_watchpoints.map((item: string) => <li key={item}>• {item}</li>)}</ul></div>}
        {intelligenceMessage && <p className="mt-3 text-xs text-muted-foreground">{intelligenceMessage}</p>}
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
            <h2 className="font-bold">Article Production</h2>
            <p className="mt-2 text-xs text-muted-foreground">Create the long-form article that will be prepared for the Africa & Beyond news website. This is the core publication output.</p>
            {articleError && <div className="mt-3 rounded-xl border border-brand-red/30 bg-brand-red/5 p-3 text-xs text-brand-red"><strong>Article production error:</strong> {articleError}</div>}
            {!article ? (
              <button disabled={articleBusy} onClick={createArticle} className="mt-4 rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white">{articleBusy ? "Creating article…" : "Create publication-ready article"}</button>
            ) : (
              <div className="mt-4 space-y-3">
                <input value={article.title || ""} onChange={(e) => setArticle((a: any) => ({ ...a, title: e.target.value }))} className="w-full rounded-xl border border-input bg-background p-3 text-sm font-semibold" />
                <textarea value={article.dek || ""} onChange={(e) => setArticle((a: any) => ({ ...a, dek: e.target.value }))} placeholder="Article standfirst / dek" className="min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm" />
                <textarea value={article.body_html || ""} onChange={(e) => setArticle((a: any) => ({ ...a, body_html: e.target.value }))} className="min-h-72 w-full rounded-xl border border-input bg-background p-3 font-mono text-xs leading-5" />
                {article.social_x || article.social_facebook || article.social_tiktok ? <div className="space-y-2 rounded-xl bg-secondary p-3 text-xs">
                  <p className="font-bold">Social distribution copy</p>
                  {article.social_x && <p><strong>X:</strong> {article.social_x}</p>}
                  {article.social_facebook && <p><strong>Facebook:</strong> {article.social_facebook}</p>}
                  {article.social_tiktok && <p><strong>TikTok:</strong> {article.social_tiktok}</p>}
                </div> : null}
                <div className="mt-4 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Programme Manager</p><p className="mt-1 text-xs text-muted-foreground">Prepare a live programme from this approved website article. Scheduling creates the programme record; normal StreamYard live shows still require the operator to enter the studio and go live.</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase">{article.website_status}</span></div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input value={schedule.title || ("Africa & Beyond Live: " + (article.title || ""))} onChange={(e) => setSchedule((s) => ({ ...s, title: e.target.value }))} placeholder="Programme title" className="rounded-xl border border-input bg-background p-2.5 text-xs" />
                    <select value={schedule.category} onChange={(e) => setSchedule((s) => ({ ...s, category: e.target.value }))} className="rounded-xl border border-input bg-background p-2.5 text-xs"><option value="news">News</option><option value="community">Community</option><option value="conference">Conference</option><option value="culture">Culture</option><option value="sports">Sports</option><option value="other">Other</option></select>
                    <input type="datetime-local" value={schedule.startAt} onChange={(e) => setSchedule((s) => ({ ...s, startAt: e.target.value }))} className="rounded-xl border border-input bg-background p-2.5 text-xs" />
                    <input type="datetime-local" value={schedule.endAt} onChange={(e) => setSchedule((s) => ({ ...s, endAt: e.target.value }))} className="rounded-xl border border-input bg-background p-2.5 text-xs" />
                    <input value={schedule.streamUrl} onChange={(e) => setSchedule((s) => ({ ...s, streamUrl: e.target.value }))} placeholder="StreamYard / watch URL (optional)" className="rounded-xl border border-input bg-background p-2.5 text-xs sm:col-span-2" />
                    <textarea value={schedule.description || article.dek || ""} onChange={(e) => setSchedule((s) => ({ ...s, description: e.target.value }))} placeholder="Programme description" className="min-h-16 rounded-xl border border-input bg-background p-2.5 text-xs sm:col-span-2" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button disabled={scheduleBusy || article.website_status !== "published" || !schedule.startAt} onClick={async () => {
                      setScheduleBusy(true); setScheduleMessage("")
                      const r = await fetch("/api/newsroom/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ articleId: article.id, ...schedule }) })
                      const d = await r.json(); setScheduleMessage(r.ok ? "Programme prepared and scheduled." : (d.error || "Scheduling failed")); setScheduleBusy(false)
                    }} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{scheduleBusy ? "Scheduling…" : "Schedule programme"}</button>
                    {article.website_status !== "published" && <span className="text-[11px] text-muted-foreground">Publish the website article first.</span>}
                    {scheduleMessage && <span className="text-[11px] text-muted-foreground">{scheduleMessage}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={articleBusy} onClick={saveArticle} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Save article</button>
                  {article.website_status !== "published" && story.status === "approved" && <button disabled={articleBusy} onClick={publishWebsite} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white">{articleBusy ? "Publishing…" : "Publish to Africa & Beyond"}</button>}
                  {article.website_status !== "published" && story.status === "review" && <button disabled={saving || articleBusy} onClick={async () => { setSaving(true); const r = await fetch("/api/newsroom/story", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storyId, verificationNotes: notes, aiDraft: draft, status: "approved" }) }); if (r.ok) { const d = await r.json(); setStory(d.story) } setSaving(false) }} className="rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white">Approve for publication</button>}
                  {article.website_url && <a href={article.website_url} target="_blank" rel="noreferrer" className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Open published article</a>}
                  <button disabled={socialBusy} onClick={async () => {
                    setSocialBusy(true)
                    const r = await fetch("/api/newsroom/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: article.id }) })
                    if (r.ok) { const d = await r.json(); setArticle(d.article) }
                    setSocialBusy(false)
                  }} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">{socialBusy ? "Preparing social…" : "Prepare social distribution"}</button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Editorial Decision</h2>
            <p className="mt-2 text-xs text-muted-foreground">Review the source, verification evidence and article before approving or holding it. Approval unlocks website publication.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={saving} onClick={() => save("verifying")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Verify</button>
              <button disabled={saving} onClick={() => save("draft")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Save draft</button>
              <button disabled={saving} onClick={() => save("review")} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white">Send to review</button>
              {story.status !== "review" && story.status !== "published" && <button disabled={saving} onClick={() => save("review")} className="rounded-full border border-brand-green/40 px-4 py-2 text-xs font-semibold text-brand-green">Open review</button>}
              <button disabled={saving} onClick={() => save("held")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Hold</button>
              <button disabled={saving || story.status !== "review" || story.confidence === "unverified" || !draft.trim()} onClick={() => save("approved")} title={story.status !== "review" ? "Send the story to review first" : story.confidence === "unverified" ? "Cross-check the story before approval" : !draft.trim() ? "Create or enter a draft before approval" : ""} className="rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Approve</button>

            </div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
        <CheckCircle2 className="mb-2 size-5 text-brand-green" /> Approval does not publish automatically. The editor explicitly creates, reviews and publishes the website article.
      </div>
    </div>
  )
}
