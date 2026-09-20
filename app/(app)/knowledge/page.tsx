"use client"

import { useMemo, useState } from "react"
import { ArrowRight, BookOpen, Brain, Download, FileText, GraduationCap, History, Library, Mic, Search, Sparkles, Upload } from "lucide-react"

const topics = [
  ["Mathematics", "Step-by-step problem solving", "∑"],
  ["Science", "Concepts, experiments & revision", "⚗"],
  ["Research", "Guides, sources & knowledge briefs", "⌕"],
  ["History", "Timelines and preserved knowledge", "◷"],
]

const knowledge = [
  ["Zimbabwe Currency History", "Knowledge Article", "WIGOD Research Archive", "Source-supported"],
  ["Linear Equations", "Learning Guide", "Mathematics Knowledge Base", "Curriculum-ready"],
  ["Research Methods", "University Guide", "Academic Materials", "Source-supported"],
]

export default function KnowledgeHubPage() {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => knowledge.filter((x) => x.join(" ").toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <main className="min-h-full bg-background">
      <header className="border-b px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Library className="size-4" />WIGOD KNOWLEDGE HUB</div>
              <h1 className="text-3xl font-semibold tracking-tight">Learn. Research. Understand.</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A growing knowledge space where authorised documents, research and resolved questions become reusable learning material.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3">
            <Search className="size-5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask WIGOD Knowledge Hub..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Search</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map(([title, detail, icon]) => (
            <button key={title} className="rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">{icon}</div>
              <div className="font-semibold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div>
            </button>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Brain className="size-6" /></div><div><h2 className="font-semibold">Ask, learn and research</h2><p className="text-xs text-muted-foreground">Turn source material into guided understanding.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Upload material", "Add a module, textbook, syllabus or research document.", Upload],
                ["Research guide", "Turn an assignment or question into a structured research plan.", FileText],
                ["AI tutor", "Get explanations matched to the learner's level.", GraduationCap],
                ["Voice learning", "Ask questions and learn conversationally.", Mic],
              ].map(([title, detail, Icon]) => { const I = Icon as typeof Upload; return <div key={title as string} className="rounded-xl border p-4"><I className="mb-3 size-5 text-primary" /><div className="text-sm font-semibold">{title as string}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{detail as string}</div></div> })}
            </div>
          </div>
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <Sparkles className="size-6" /><h2 className="mt-4 text-xl font-semibold">Create an offline pack</h2><p className="mt-2 text-sm opacity-90">Prepare source-linked notes, explanations, examples and revision material for use when connectivity is limited.</p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-semibold text-foreground"><Download className="size-4" />Build Knowledge Pack</button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Knowledge already in WIGOD</h2><p className="text-xs text-muted-foreground">Previously processed material can become reusable knowledge.</p></div><History className="size-5 text-muted-foreground" /></div>
          <div className="divide-y">
            {filtered.map(([title, type, source, status]) => <button key={title} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><div className="font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{type} · {source}</div></div><span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:block">{status}</span><ArrowRight className="size-4 text-muted-foreground" /></button>)}
            {!filtered.length && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No knowledge records match your search.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-dashed p-5"><div className="flex gap-3"><BookOpen className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Prototype stage</h2><p className="mt-1 text-sm text-muted-foreground">This first Knowledge Hub screen establishes the experience. Next: connect uploads, Supabase knowledge records, document processing, source citations, AI research and offline packs.</p></div></div></section>
      </div>
    </main>
  )
}
