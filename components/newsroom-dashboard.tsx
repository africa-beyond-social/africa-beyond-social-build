"use client"

import { useEffect, useMemo, useState } from "react"
import { StoryWorkspace } from "@/components/story-workspace"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  Globe2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react"

type StoryStatus = "NEW" | "VERIFYING" | "DRAFT" | "REVIEW" | "HELD"
type Story = {
  id: string
  title: string
  source: string
  time: string
  status: StoryStatus
  confidence: "Unverified" | "Developing" | "Cross-checked"
  url: string
}

const initialStories: Story[] = []

const statusStyles: Record<StoryStatus, string> = {
  NEW: "bg-secondary text-foreground",
  VERIFYING: "bg-[#d4a017]/10 text-[#9a7400]",
  DRAFT: "bg-brand-green/10 text-brand-green",
  REVIEW: "bg-brand-red/10 text-brand-red",
  HELD: "bg-muted text-muted-foreground",
}

export function NewsroomDashboard() {
  const [stories, setStories] = useState(initialStories)
  const [sources, setSources] = useState<string[]>([])
  const [sourceInput, setSourceInput] = useState("")
  const [query, setQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState<StoryStatus | "ALL">("ALL")
  const [sourceType, setSourceType] = useState("rss")
  const [sourceUrl, setSourceUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<string | null>(null)
  const [sourceError, setSourceError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [deskOpen, setDeskOpen] = useState(false)
  const [deskEvents, setDeskEvents] = useState<any[]>([])
  const [deskLoading, setDeskLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  async function loadNewsroom(showLoading = true) {
    if (showLoading) setRefreshing(true)
    try {
      if (showLoading) {
        const ingestRes = await fetch("/api/newsroom/ingest", { cache: "no-store" })
        const ingestData = await ingestRes.json()
        if (!ingestRes.ok) throw new Error(ingestData.error || "Unable to scan newsroom sources")
      }
      const [sourceRes, storyRes] = await Promise.all([
        fetch("/api/newsroom/sources", { cache: "no-store" }),
        fetch("/api/newsroom/stories", { cache: "no-store" }),
      ])
      const sourceData = await sourceRes.json()
      const storyData = await storyRes.json()
      if (!sourceRes.ok) throw new Error(sourceData.error || "Unable to load newsroom sources")
      if (!storyRes.ok) throw new Error(storyData.error || "Unable to load newsroom stories")
      setSources((sourceData.sources ?? []).map((s: { name: string }) => s.name))
      setStories((storyData.stories ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        source: s.source_name ?? "Unknown source",
        time: s.published_at ? new Date(s.published_at).toLocaleString() : "Detected",
        status: String(s.status).toUpperCase(),
        confidence: s.confidence === "cross_checked" ? "Cross-checked" : s.confidence === "developing" ? "Developing" : "Unverified",
        url: s.canonical_url ?? s.source_url,
      })))
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Unable to load newsroom data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadNewsroom(false)
  }, [])

  const filtered = useMemo(
    () =>
      stories.filter((story) => {
        const matchesQuery = !query || `${story.title} ${story.source}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = activeStatus === "ALL" || story.status === activeStatus
        return matchesQuery && matchesStatus
      }),
    [stories, query, activeStatus],
  )

  async function addSource() {
    const name = sourceInput.trim()
    let url = sourceUrl.trim()
    setSourceError("")
    if (!name || !url) {
      setSourceError("Enter both a source name and source URL.")
      return
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url

    try {
      const response = await fetch("/api/newsroom/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, url, sourceType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to add source")
      setSources((current) => [...current, data.source.name])
      setSourceInput("")
      setSourceUrl("")
      setSourceError("")
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Unable to add source")
    }
  }

  async function advance(id: string) {
    const current = stories.find((s) => s.id === id)
    if (!current) return
    const next: StoryStatus = current.status === "NEW" ? "VERIFYING" : current.status === "VERIFYING" ? "DRAFT" : current.status === "DRAFT" ? "REVIEW" : current.status
    if (next === current.status) return
    const response = await fetch("/api/newsroom/stories", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: next.toLowerCase(), confidence: next === "DRAFT" || next === "REVIEW" ? "cross_checked" : undefined }) })
    if (response.ok) setStories((items) => items.map((s) => s.id === id ? { ...s, status: next, confidence: next === "DRAFT" || next === "REVIEW" ? "Cross-checked" : s.confidence } : s))
  }

  async function hold(id: string) {
    const response = await fetch("/api/newsroom/stories", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: "held" }) })
    if (response.ok) setStories((current) => current.map((story) => story.id === id ? { ...story, status: "HELD" } : story))
  }

  if (selectedStory) {
    return <StoryWorkspace storyId={selectedStory} onClose={() => setSelectedStory(null)} />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4">
        <div><p className="text-sm font-bold">Editors Desk</p><p className="mt-1 text-xs text-muted-foreground">Review every scheduled livestream, website link, story summary and critical watchpoint from one place.</p></div>
        <button onClick={() => { setDeskOpen(true); loadDesk() }} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white"><Radio className="size-3.5" /> Open Editors Desk</button>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Incoming", stories.filter((s) => s.status === "NEW").length, Activity],
          ["Verifying", stories.filter((s) => s.status === "VERIFYING").length, ShieldCheck],
          ["For review", stories.filter((s) => s.status === "REVIEW").length, FileText],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <Icon className="size-4 text-brand-green" />
            </div>
            <p className="mt-2 text-2xl font-bold">{value as number}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Source Scout</h2>
            <p className="text-xs text-muted-foreground">Control the sources the newsroom watches.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green">
            <Activity className="size-3.5" /> Monitoring
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sources.map((source) => (
            <span key={source} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
              <Globe2 className="size-3.5" /> {source}
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSource()}
            placeholder="Source name (e.g. News website)"
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="RSS/Atom feed URL" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="rss">RSS/Atom</option><option value="website">Website</option><option value="x">X</option><option value="facebook">Facebook</option><option value="google_news">Google News</option></select>
          <button type="button" onClick={addSource} disabled={!sourceInput.trim() || !sourceUrl.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="size-4" /> Add
          </button>
        </div>
        {sourceError && (
          <p className="mt-2 rounded-xl border border-brand-red/20 bg-brand-red/5 px-3 py-2 text-xs text-brand-red">{sourceError}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">News Detection Queue</h2>
              <p className="text-xs text-muted-foreground">Detected items move through verification before editorial review.</p>
            </div>
            <button onClick={() => loadNewsroom(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-input px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search detected stories" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Filter className="size-3.5" /> Filter</button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {(["ALL", "NEW", "VERIFYING", "DRAFT", "REVIEW", "HELD"] as const).map((status) => (
              <button key={status} onClick={() => setActiveStatus(status)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${activeStatus === status ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="p-8 text-center text-sm text-muted-foreground">Loading live newsroom data…</div>}
        <div className="divide-y divide-border">
          {filtered.map((story) => (
            <article key={story.id} className="cursor-pointer p-4 transition-colors hover:bg-secondary/40" onClick={() => setSelectedStory(story.id)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[story.status]}`}>{story.status}</span>
                    <span className="text-[11px] text-muted-foreground">{story.source} · {story.time}</span>
                  </div>
                  <h3 className="mt-2 font-semibold leading-snug">{story.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" /> {story.confidence}</span>
                    <a href={story.url} className="inline-flex items-center gap-1 hover:text-foreground"><ExternalLink className="size-3.5" /> Original source</a>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {story.status !== "REVIEW" && story.status !== "HELD" && (
                    <button onClick={() => advance(story.id)} className="rounded-full bg-brand-green px-3 py-2 text-xs font-semibold text-white">
                      {story.status === "NEW" ? "Verify" : story.status === "VERIFYING" ? "Prepare draft" : "Send to review"}
                    </button>
                  )}
                  {story.status !== "HELD" && (
                    <button onClick={() => hold(story.id)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold">
                      Hold
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">No newsroom items match this filter.</div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2"><Sparkles className="size-5 text-brand-green" /><h2 className="font-bold">Newsroom AI</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Drafting and cross-checking will run here once the source and AI services are connected.</p>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-green" /> Attribution preserved</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-brand-green" /> Conflicting sources surfaced</p>
            <p className="flex items-center gap-2"><AlertTriangle className="size-4 text-[#9a7400]" /> Editorial/legal flags before publishing</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2"><Radio className="size-5 text-brand-red" /><h2 className="font-bold">Editorial Review</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Nothing reaches publishing automatically. The editor controls the final decision.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary p-3"><Clock3 className="size-4" /><p className="mt-1 text-xs font-semibold">Review queue</p></div>
            <div className="rounded-xl bg-secondary p-3"><XCircle className="size-4" /><p className="mt-1 text-xs font-semibold">Held stories</p></div>
          </div>
        </div>
      </section>
    </div>
  )
}
