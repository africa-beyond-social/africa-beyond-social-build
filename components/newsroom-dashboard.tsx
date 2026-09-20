"use client"

import { useMemo, useState } from "react"
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

const initialStories: Story[] = [
  { id: "1", title: "Zimbabwe political developments draw fresh public reaction", source: "Selected source", time: "12 min ago", status: "NEW", confidence: "Unverified", url: "#" },
  { id: "2", title: "Regional leaders issue statements on a developing story", source: "Google News", time: "31 min ago", status: "VERIFYING", confidence: "Developing", url: "#" },
  { id: "3", title: "Community report receives confirmation from two sources", source: "News desk", time: "1 hr ago", status: "DRAFT", confidence: "Cross-checked", url: "#" },
]

const statusStyles: Record<StoryStatus, string> = {
  NEW: "bg-secondary text-foreground",
  VERIFYING: "bg-[#d4a017]/10 text-[#9a7400]",
  DRAFT: "bg-brand-green/10 text-brand-green",
  REVIEW: "bg-brand-red/10 text-brand-red",
  HELD: "bg-muted text-muted-foreground",
}

export function NewsroomDashboard() {
  const [stories, setStories] = useState(initialStories)
  const [sources, setSources] = useState(["Google News", "Selected websites"])
  const [sourceInput, setSourceInput] = useState("")
  const [query, setQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState<StoryStatus | "ALL">("ALL")

  const filtered = useMemo(
    () =>
      stories.filter((story) => {
        const matchesQuery = !query || `${story.title} ${story.source}`.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = activeStatus === "ALL" || story.status === activeStatus
        return matchesQuery && matchesStatus
      }),
    [stories, query, activeStatus],
  )

  function advance(id: string) {
    setStories((current) =>
      current.map((story) => {
        if (story.id !== id) return story
        const next: StoryStatus = story.status === "NEW" ? "VERIFYING" : story.status === "VERIFYING" ? "DRAFT" : story.status === "DRAFT" ? "REVIEW" : story.status
        return { ...story, status: next, confidence: next === "DRAFT" || next === "REVIEW" ? "Cross-checked" : story.confidence }
      }),
    )
  }

  function hold(id: string) {
    setStories((current) => current.map((story) => story.id === id ? { ...story, status: "HELD" } : story))
  }

  function addSource() {
    const value = sourceInput.trim()
    if (!value || sources.includes(value)) return
    setSources((current) => [...current, value])
    setSourceInput("")
  }

  return (
    <div className="space-y-5">
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
            placeholder="Add website, X account or Facebook page"
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <button onClick={addSource} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white">
            <Plus className="size-4" /> Add
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">News Detection Queue</h2>
              <p className="text-xs text-muted-foreground">Detected items move through verification before editorial review.</p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
              <RefreshCw className="size-3.5" /> Refresh
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

        <div className="divide-y divide-border">
          {filtered.map((story) => (
            <article key={story.id} className="p-4">
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
