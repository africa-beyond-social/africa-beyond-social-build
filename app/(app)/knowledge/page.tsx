"use client"

import { useMemo, useState } from "react"
import { ArrowRight, BookOpen, Brain, ChevronDown, Download, FileText, GraduationCap, History, Library, Mic, Plus, Search, Sparkles, Upload, CheckCircle2 } from "lucide-react"

const primarySubjects = ["Mathematics","English","Shona","Physical Education & Arts","Science & Technology","Social Science"]
const secondarySubjects = ["Commerce","Mathematics","English","Science","Shona","Accounting","Geography","Religious Education","Heritage Studies"]

const knowledge = [
  ["Zimbabwe Currency History","Knowledge Article","WIGOD Research Archive","Source-supported"],
  ["Linear Equations","Learning Guide","Mathematics Knowledge Base","Curriculum-ready"],
  ["Research Methods","University Guide","Academic Materials","Source-supported"],
]

const active = (on: boolean) => on ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-muted"

export default function KnowledgeHubPage() {
  const [query, setQuery] = useState("")
  const [section, setSection] = useState<"curriculum"|"archive"|"add">("curriculum")
  const [level, setLevel] = useState<"primary"|"secondary">("primary")
  const [grade, setGrade] = useState("Grade 1")
  const [subject, setSubject] = useState(primarySubjects[0])
  const [fileName, setFileName] = useState("")
  const [added, setAdded] = useState(false)\n  const [uploading, setUploading] = useState(false)\n  const [error, setError] = useState("")

  const filtered = useMemo(() => knowledge.filter(x => x.join(" ").toLowerCase().includes(query.toLowerCase())), [query])
  const grades = level === "primary" ? Array.from({length:7}, (_,i)=>`Grade ${i+1}`) : Array.from({length:6}, (_,i)=>`Form ${i+1}`)
  const subjects = level === "primary" ? primarySubjects : secondarySubjects

  async function uploadMaterial() {\n    const input = document.querySelector<HTMLInputElement>("input[type=file]")\n    const file = input?.files?.[0]\n    if (!file) { setError("Choose a document first."); return }\n    setUploading(true); setError(""); setAdded(false)\n    try {\n      const form = new FormData()\n      form.append("file", file)\n      form.append("level", level)\n      form.append("grade", grade)\n      form.append("subject", subject)\n      form.append("title", fileName || file.name)\n      const response = await fetch("/api/knowledge/documents", { method: "POST", body: form })\n      const result = await response.json()\n      if (!response.ok) throw new Error(result.error || "Upload failed")\n      setAdded(true)\n      setFileName(result.document?.title || file.name)\n    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed") } finally { setUploading(false) }\n  }\n\n  function changeLevel(next: "primary"|"secondary") {
    setLevel(next)
    setGrade(next === "primary" ? "Grade 1" : "Form 1")
    setSubject((next === "primary" ? primarySubjects : secondarySubjects)[0])
  }

  return (
    <main className="min-h-full bg-background">
      <header className="border-b px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Library className="size-4" /> WIGOD KNOWLEDGE HUB V2</div>
              <h1 className="text-3xl font-semibold tracking-tight">Learn. Research. Understand.</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Zimbabwe curriculum, user-supplied academic materials and reusable knowledge — built as an expandable archive.</p>
            </div>
            <div className="rounded-xl border bg-card px-3 py-2 text-xs font-medium"><span className="text-primary">V2</span> · Curriculum Engine</div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3">
            <Search className="size-5 text-muted-foreground" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask WIGOD Knowledge Hub..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <button onClick={()=>setSection("archive")} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Search</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={()=>setSection("curriculum")} className={`rounded-xl px-3 py-2 text-sm font-medium ${active(section==="curriculum")}`}>Curriculum Library</button>
            <button onClick={()=>setSection("archive")} className={`rounded-xl px-3 py-2 text-sm font-medium ${active(section==="archive")}`}>Knowledge Archive</button>
            <button onClick={()=>setSection("add")} className={`rounded-xl px-3 py-2 text-sm font-medium ${active(section==="add")}`}>Add Material</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {section === "curriculum" && (
          <>
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold">Zimbabwe Curriculum Library</h2><p className="mt-1 text-xs text-muted-foreground">Expandable structure: ECD A/B → Grade 1–7 → Form 1–6 → Polytechnic → University.</p></div>
                <button onClick={()=>setSection("add")} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"><Plus className="size-4" /> Add subject/material</button>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={()=>changeLevel("primary")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="primary")}`}>Primary</button>
                <button onClick={()=>changeLevel("secondary")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="secondary")}`}>Secondary</button>
                <button onClick={()=>setSection("add")} className="rounded-xl border px-4 py-2 text-sm font-medium">Polytechnic / University</button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  {grades.map(g=><button key={g} onClick={()=>setGrade(g)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${grade===g ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}>{g}<ChevronDown className="size-4 opacity-50" /></button>)}
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{grade} subjects</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {subjects.map(s=><button key={s} onClick={()=>setSubject(s)} className={`rounded-xl border bg-card p-4 text-left hover:border-primary/50 ${subject===s ? "ring-2 ring-primary/20" : ""}`}><BookOpen className="mb-3 size-5 text-primary" /><div className="font-semibold">{s}</div><div className="mt-1 text-xs text-muted-foreground">Topics · lessons · practice · research</div></button>)}
                    <button onClick={()=>setSection("add")} className="rounded-xl border border-dashed p-4 text-left hover:bg-card"><Plus className="mb-3 size-5 text-muted-foreground" /><div className="font-semibold">Add another subject</div><div className="mt-1 text-xs text-muted-foreground">Future editions fit here without redesign.</div></button>
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[["Learn","Curriculum-aligned explanations",GraduationCap],["Ask","Upload a question or assignment",Brain],["Research","Build source-linked research guides",FileText],["Voice","Learn conversationally",Mic]].map(([title,detail,Icon])=>{const I=Icon as typeof Brain;return <div key={title as string} className="rounded-2xl border bg-card p-4"><I className="mb-3 size-5 text-primary" /><div className="font-semibold">{title as string}</div><div className="mt-1 text-xs text-muted-foreground">{detail as string}</div></div>})}
            </section>
            <section className="rounded-2xl bg-primary p-5 text-primary-foreground"><Sparkles className="size-6" /><h2 className="mt-4 text-xl font-semibold">Offline Knowledge Packs</h2><p className="mt-2 max-w-2xl text-sm opacity-90">Build downloadable, source-linked learning material for students with limited connectivity. Packs can later sync when internet returns.</p><button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-semibold text-foreground"><Download className="size-4" /> Build Knowledge Pack</button></section>
          </>
        )}

        {section === "archive" && (
          <section className="rounded-2xl border bg-card">
            <div className="border-b px-5 py-5"><div className="flex items-center gap-3"><History className="size-5 text-primary" /><div><h2 className="font-semibold">Knowledge Archive</h2><p className="text-xs text-muted-foreground">Previously resolved questions, research and source-supported material become reusable knowledge.</p></div></div></div>
            <div className="divide-y">{filtered.map(([title,type,source,status])=><button key={title} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><div className="font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{type} · {source}</div></div><span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:block">{status}</span><ArrowRight className="size-4 text-muted-foreground" /></button>)}{!filtered.length&&<div className="px-5 py-10 text-center text-sm text-muted-foreground">No knowledge records match your search.</div>}</div>
          </section>
        )}

        {section === "add" && (
          <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3"><Upload className="size-5 text-primary" /><div><h2 className="font-semibold">Add Curriculum or Academic Material</h2><p className="text-xs text-muted-foreground">Add authorised material and place it in the correct learning path.</p></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-2 block font-medium">Education level</span><select value={level} onChange={e=>changeLevel(e.target.value as "primary"|"secondary")} className="w-full rounded-xl border bg-background px-3 py-2.5"><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
                <label className="text-sm"><span className="mb-2 block font-medium">Grade / Form</span><select value={grade} onChange={e=>setGrade(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5">{grades.map(g=><option key={g}>{g}</option>)}</select></label>
                <label className="text-sm sm:col-span-2"><span className="mb-2 block font-medium">Subject</span><select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5">{subjects.map(s=><option key={s}>{s}</option>)}<option>+ Add new subject</option></select></label>
                <label className="text-sm sm:col-span-2"><span className="mb-2 block font-medium">Material title</span><input value={fileName} onChange={e=>setFileName(e.target.value)} placeholder="e.g. Form 2 Mathematics syllabus" className="w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" /></label>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed p-6 text-center"><Upload className="mx-auto size-7 text-muted-foreground" /><div className="mt-2 text-sm font-medium">Choose a PDF, document or text file</div><div className="mt-1 text-xs text-muted-foreground">Next processing stage will extract text, identify topics and create source-linked knowledge.</div><input type="file" className="mx-auto mt-4 block max-w-full text-xs" onChange={e=>setFileName(e.target.files?.[0]?.name||fileName)} /></div>
              <button onClick={uploadMaterial} disabled={uploading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Upload className="size-4" /> {uploading ? "Uploading..." : "Queue for Knowledge Processing"}</button>\n              {error&&<div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {added&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"><CheckCircle2 className="size-4" /> Material queued: {fileName||"untitled material"} · {grade} · {subject}</div>}
            </div>
            <div className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Processing pipeline</h2><div className="mt-5 space-y-4">{["Document intake","Text extraction","Topic & concept detection","Knowledge creation","Source verification","Archive & search"].map((step,i)=><div key={step} className="flex gap-3"><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i+1}</div><div><div className="text-sm font-medium">{step}</div><div className="mt-0.5 text-xs text-muted-foreground">{i<2?"Foundation stage":"Knowledge Engine stage"}</div></div></div>)}</div><div className="mt-6 rounded-xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">Only material you are authorised to store or distribute should be made public. Private institution or student materials remain access-controlled.</div></div>
          </section>
        )}
      </div>
    </main>
  )
}
