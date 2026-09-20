"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Brain, ChevronDown, Download, FileText, GraduationCap, History, Library, Mic, Plus, Search, Sparkles, Upload, CheckCircle2, RefreshCw, Trash2, AlertTriangle } from "lucide-react"

const primarySubjects = ["Mathematics","English","Shona","Physical Education & Arts","Science & Technology","Social Science"]
const secondarySubjects = ["Commerce","Mathematics","English","Science","Shona","Accounting","Geography","Religious Education","Heritage Studies"]
const tertiarySubjects = ["Education","Business","Computing","Engineering","Agriculture","Health Sciences","Law","Social Sciences"]
type EducationLevel = "preschool"|"primary"|"secondary"|"tertiary"

const knowledge = [
  ["Zimbabwe Currency History","Knowledge Article","WIGOD Research Archive","Source-supported"],
  ["Linear Equations","Learning Guide","Mathematics Knowledge Base","Curriculum-ready"],
  ["Research Methods","University Guide","Academic Materials","Source-supported"],
]

const active = (on: boolean) => on ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-muted"
type KnowledgeSection = "home"|"curriculum"|"learn"|"ask"|"research"|"voice"|"archive"|"add"

export default function KnowledgeHubPage() {
  const [query, setQuery] = useState("")
  const [section, setSection] = useState<KnowledgeSection>("home")
  const [sectionHistory, setSectionHistory] = useState<KnowledgeSection[]>([])
  const [level, setLevel] = useState<EducationLevel>("primary")
  const [grade, setGrade] = useState("Grade 1")
  const [subject, setSubject] = useState(primarySubjects[0])
  const [fileName, setFileName] = useState("")
  const [added, setAdded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [documents, setDocuments] = useState<Array<{id:string;title:string;processing_status:string;education_level:string;subject:string;syllabus_version:string;metadata?:Record<string,unknown>;created_at:string}>>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processMessage, setProcessMessage] = useState("")
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [aiId, setAiId] = useState<string | null>(null)
  const [records, setRecords] = useState<Array<{id:string;title:string;record_type:string;summary:string;verification_status:string;source_document_ids:string[];created_at:string}>>([])
  const [asking, setAsking] = useState(false)
  const [tutorAnswer, setTutorAnswer] = useState<{answer:string;confidence:string;follow_up_questions:string[];sources:Array<{chunk_index:number;document_title?:string;heading?:string;source_locator?:string;preview:string}>}|null>(null)
  const [tutorError, setTutorError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documentError, setDocumentError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [listening, setListening] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => knowledge.filter(x => x.join(" ").toLowerCase().includes(query.toLowerCase())), [query])

  async function loadDocuments() {
    try {
      const response = await fetch("/api/knowledge/documents", { cache: "no-store" })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setDocumentError(result.error || `Unable to load materials (HTTP ${response.status}).`)
        return
      }
      setDocumentError("")
      setDocuments(result.documents || [])
    } catch (e) {
      setDocumentError(e instanceof Error ? e.message : "Unable to load materials.")
    }
  }

  async function loadRecords() {
    try {
      const response = await fetch("/api/knowledge/records", { cache: "no-store" })
      if (!response.ok) return
      const result = await response.json()
      setRecords(result.records || [])
    } catch {}
  }

  useEffect(() => { loadDocuments(); loadRecords() }, [])

  function goTo(next: KnowledgeSection) {
    if (next !== section) setSectionHistory(history => [...history, section])
    setSection(next)
    if (next === "ask" || next === "research" || next === "voice") {
      window.setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }

  function goBack() {
    setSectionHistory(history => {
      if (!history.length) {
        setSection("home")
        return history
      }
      const next = history[history.length - 1]
      setSection(next)
      return history.slice(0, -1)
    })
  }

  function handleAskClick() {
    if (!query.trim()) {
      goTo("ask")
      return
    }
    askKnowledge()
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setTutorError("Voice input is not supported by this browser. Try Chrome or Edge.")
      goTo("voice")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "en-ZW"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      setTutorError("Voice input could not be started. Please check microphone permission.")
    }
    recognition.onresult = (event: any) => {
      const spoken = String(event.results?.[0]?.[0]?.transcript || "").trim()
      if (!spoken) return
      setQuery(spoken)
      setSection("ask")
      window.setTimeout(() => askKnowledge(spoken), 100)
    }
    recognition.start()
  }

  function downloadKnowledgePack() {
    const text = [
      "WIGOD KNOWLEDGE PACK",
      "",
      "Curriculum: " + level,
      "Stage: " + grade,
      "Subject: " + subject,
      "",
      "Knowledge records:",
      ...records.slice(0, 20).map((record) => "- " + record.title + ": " + record.summary),
    ].join("\n")
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "WIGOD-Knowledge-Pack.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function askKnowledge(questionOverride?: string) {
    const question = (questionOverride ?? query).trim()
    if (!question) return
    setAsking(true)
    setTutorError("")
    setTutorAnswer(null)
    try {
      const response = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      })
      const contentType = response.headers.get("content-type") || ""
      const result = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : { error: await response.text().catch(() => "") }
      if (!response.ok) throw new Error(result.error || `Knowledge Tutor failed (HTTP ${response.status})`)
      if (!result.grounded) {
        setTutorAnswer({ answer: result.answer || "No supporting knowledge was found.", confidence: "insufficient", follow_up_questions: [], sources: [] })
      } else {
        setTutorAnswer(result)
      }
    } catch (e) {
      setTutorError(e instanceof Error ? e.message : "Knowledge Tutor failed")
    } finally {
      setAsking(false)
    }
  }

  async function generateAI(id: string) {
    setAiId(id)
    setProcessMessage("")
    try {
      const response = await fetch(`/api/knowledge/documents/${id}/generate-ai`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "AI knowledge generation failed")
      setProcessMessage(`AI Knowledge Engine enriched ${result.records_updated} records and created ${result.questions_created} study questions.`)
      await loadRecords()
    } catch (e) {
      setProcessMessage(e instanceof Error ? e.message : "AI knowledge generation failed.")
    } finally {
      setAiId(null)
    }
  }

  async function generateKnowledge(id: string) {
    setGeneratingId(id)
    setProcessMessage("")
    try {
      const response = await fetch(`/api/knowledge/documents/${id}/generate`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Knowledge generation failed")
      setProcessMessage(`Knowledge Engine created ${result.records_created} source-supported knowledge records.`)
      await loadRecords()
      await loadDocuments()
    } catch (e) {
      setProcessMessage(e instanceof Error ? e.message : "Knowledge generation failed.")
    } finally {
      setGeneratingId(null)
    }
  }

  async function processDocument(id: string) {
    setProcessingId(id)
    setProcessMessage("")
    try {
      const response = await fetch(`/api/knowledge/documents/${id}/process`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Processing failed")
      setProcessMessage(`Processed successfully: ${result.chunks_created} knowledge chunks created.`)
      await loadDocuments()
      await loadRecords()
    } catch (e) {
      setProcessMessage(e instanceof Error ? e.message : "Processing failed.")
      await loadDocuments()
    } finally {
      setProcessingId(null)
    }
  }
  const grades = level === "preschool"
    ? ["ECD A","ECD B"]
    : level === "primary"
      ? Array.from({length:7}, (_,i)=>`Grade ${i+1}`)
      : level === "secondary"
        ? Array.from({length:6}, (_,i)=>`Form ${i+1}`)
        : ["Certificate","Diploma","Undergraduate Degree","Postgraduate"]
  const subjects = level === "primary" ? primarySubjects : level === "secondary" ? secondarySubjects : level === "tertiary" ? tertiarySubjects : ["Early Childhood Development"]

  function validationFlagsFor(levelValue: EducationLevel, gradeValue: string, titleValue: string, fileNameValue: string) {
    const haystack = `${titleValue} ${fileNameValue}`.toLowerCase()
    const flags: string[] = []
    if (levelValue === "tertiary" && /\b(grade|form)\s*[1-7]\b/i.test(gradeValue)) flags.push("Tertiary material is assigned to a school Grade/Form.")
    if (levelValue === "preschool" && !/^ecd\s/i.test(gradeValue)) flags.push("Preschool material is assigned to a non-ECD learning stage.")
    if (levelValue === "primary" && !/^grade\s/i.test(gradeValue)) flags.push("Primary material is assigned to a non-Grade learning stage.")
    if (levelValue === "secondary" && !/^form\s/i.test(gradeValue)) flags.push("Secondary material is assigned to a non-Form learning stage.")
    if (levelValue !== "tertiary" && /\b(university|undergraduate|postgraduate|diploma|degree|tertiary|polytechnic)\b/i.test(haystack)) flags.push("Title/file name contains tertiary-level indicators.")
    if (levelValue === "tertiary" && /\b(grade\s*[1-7]|primary school|secondary school|form\s*[1-6])\b/i.test(haystack)) flags.push("Title/file name contains school-level indicators.")
    return flags
  }

  async function refreshMaterials() {
    setRefreshing(true)
    try { await Promise.all([loadDocuments(), loadRecords()]) } finally { setRefreshing(false) }
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("Delete this material and its stored source file? This cannot be undone.")) return
    setDeletingId(id)
    setProcessMessage("")
    try {
      const response = await fetch(`/api/knowledge/documents/${id}`, { method: "DELETE" })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to delete material.")
      await loadDocuments()
      await loadRecords()
    } catch (e) {
      setProcessMessage(e instanceof Error ? e.message : "Unable to delete material.")
    } finally {
      setDeletingId(null)
    }
  }

  async function uploadMaterial() {
    const file = selectedFile || fileInputRef.current?.files?.[0]
    if (!file) { setError("Choose a document first."); return }
    setUploading(true); setError(""); setAdded(false)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("level", level)
      form.append("grade", grade)
      form.append("subject", subject)
      form.append("title", fileName || file.name)
      const response = await fetch("/api/knowledge/documents", { method: "POST", body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Upload failed")
      setAdded(true)
      setError("")
      setFileName(result.document?.title || file.name)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await loadDocuments()
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed") } finally { setUploading(false) }
  }

  function changeLevel(next: EducationLevel) {
    setLevel(next)
    const nextGrade = next === "preschool" ? "ECD A" : next === "primary" ? "Grade 1" : next === "secondary" ? "Form 1" : "Undergraduate Degree"
    const nextSubjects = next === "primary" ? primarySubjects : next === "secondary" ? secondarySubjects : next === "tertiary" ? tertiarySubjects : ["Early Childhood Development"]
    setGrade(nextGrade)
    setSubject(nextSubjects[0])
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
            <input ref={searchInputRef} value={query} onChange={e=>{setQuery(e.target.value); if(!e.target.value.trim()) setTutorAnswer(null)}} onKeyDown={e=>{if(e.key==="Enter") askKnowledge()}} placeholder="Ask WIGOD Knowledge Hub..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <button onClick={handleAskClick} disabled={asking} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{asking ? "Thinking..." : "Ask WIGOD"}</button>
          </div>
          {tutorError && <div className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{tutorError}</div>}
          {tutorAnswer && <div className="mt-4 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold"><Brain className="size-5 text-primary" /> WIGOD Knowledge Tutor</div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">{tutorAnswer.confidence}</span>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7">{tutorAnswer.answer}</div>
            {tutorAnswer.sources.length > 0 && <div className="mt-5 border-t pt-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Knowledge sources used</div><div className="mt-2 space-y-2">{tutorAnswer.sources.slice(0,6).map((source,i)=><div key={i} className="rounded-xl bg-muted/40 p-3 text-xs"><div className="font-semibold">{source.document_title || "Knowledge source"}</div><div className="mt-1 text-muted-foreground">{source.heading || source.source_locator || ("Source " + source.chunk_index)}</div><div className="mt-1 text-muted-foreground">{source.preview}</div></div>)}</div></div>}
            {tutorAnswer.follow_up_questions.length > 0 && <div className="mt-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You can ask next</div><div className="mt-2 flex flex-wrap gap-2">{tutorAnswer.follow_up_questions.map((q,i)=><button key={i} onClick={()=>{setQuery(q); askKnowledge(q)}} className="rounded-xl border px-3 py-2 text-xs hover:bg-muted">{q}</button>)}</div></div>}
          </div>}
          <nav aria-label="Knowledge Hub navigation" className="mt-4 rounded-2xl border bg-card p-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
              <button onClick={goBack} disabled={!sectionHistory.length && section === "home"} aria-label="Go back" className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-2 py-2.5 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                <ArrowLeft className="size-4" /> Back
              </button>
              {[
                ["home","Home"],["learn","Learn"],["ask","Ask"],["research","Research"],
                ["voice","Voice"],["curriculum","Curriculum"],["archive","Library"],
              ].map(([id,label]) => (
                <button key={id} onClick={() => goTo(id as typeof section)} className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${active(section===id)}`}>{label}</button>
              ))}
              <button onClick={() => goTo("add")} className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${active(section==="add")}`}>
                Add Material
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {section === "home" && (
          <>
            <section className="rounded-2xl border bg-card p-6">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Knowledge Hub Home</div>
                <h2 className="mt-2 text-2xl font-semibold">One place to Learn, Ask, Research and use Voice.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose one activity below. Each activity has its own workspace, so you do not need to make the same selection in several places.</p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["learn","Learn","Open the curriculum learning workspace.",GraduationCap],
                  ["ask","Ask WIGOD","Ask questions against processed Knowledge materials.",Brain],
                  ["research","Research","Search your source-linked Knowledge Archive.",FileText],
                  ["voice","Voice","Ask WIGOD using your microphone.",Mic],
                ].map(([id,title,detail,Icon]) => {
                  const I = Icon as typeof Brain
                  return <button key={id as string} onClick={() => goTo(id as typeof section)} className="rounded-2xl border bg-background p-5 text-left transition hover:border-primary/50 hover:bg-muted/40">
                    <I className="mb-4 size-6 text-primary" /><div className="font-semibold">{title as string}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail as string}</div>
                    <div className="mt-4 text-xs font-semibold text-primary">Open →</div>
                  </button>
                })}
              </div>
            </section>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button onClick={() => goTo("curriculum")} className="rounded-2xl border bg-card p-5 text-left hover:bg-muted/40"><Library className="mb-3 size-5 text-primary" /><div className="font-semibold">Curriculum</div><div className="mt-1 text-xs text-muted-foreground">Preschool · Primary · Secondary · Tertiary</div></button>
              <button onClick={() => goTo("archive")} className="rounded-2xl border bg-card p-5 text-left hover:bg-muted/40"><History className="mb-3 size-5 text-primary" /><div className="font-semibold">Knowledge Library</div><div className="mt-1 text-xs text-muted-foreground">{records.length} reusable knowledge records</div></button>
              <button onClick={() => goTo("add")} className="rounded-2xl border bg-card p-5 text-left hover:bg-muted/40"><Upload className="mb-3 size-5 text-primary" /><div className="font-semibold">Add Material</div><div className="mt-1 text-xs text-muted-foreground">Upload authorised curriculum and academic material.</div></button>
            </section>
          </>
        )}

        {section === "learn" && (
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Learn</h2><p className="mt-1 text-xs text-muted-foreground">Select the learning path once, then explore subjects.</p></div><button onClick={() => goTo("curriculum")} className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted">Open full Curriculum</button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-2 block font-medium">Education level</span><select value={level} onChange={e=>changeLevel(e.target.value as EducationLevel)} className="w-full rounded-xl border bg-background px-3 py-2.5"><option value="preschool">Preschool</option><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="tertiary">Tertiary</option></select></label>
              <label className="text-sm"><span className="mb-2 block font-medium">Grade / Form / Programme</span><select value={grade} onChange={e=>setGrade(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5"><option value="">Select Grade / Form / Programme</option><optgroup label="Preschool"><option value="ECD A">ECD A</option><option value="ECD B">ECD B</option></optgroup><optgroup label="Primary"><option value="Grade 1">Grade 1</option><option value="Grade 2">Grade 2</option><option value="Grade 3">Grade 3</option><option value="Grade 4">Grade 4</option><option value="Grade 5">Grade 5</option><option value="Grade 6">Grade 6</option><option value="Grade 7">Grade 7</option></optgroup><optgroup label="Secondary"><option value="Form 1">Form 1</option><option value="Form 2">Form 2</option><option value="Form 3">Form 3</option><option value="Form 4">Form 4</option><option value="Form 5">Form 5</option><option value="Form 6">Form 6</option></optgroup><optgroup label="Tertiary"><option value="Certificate">Certificate</option><option value="Diploma">Diploma</option><option value="Undergraduate Degree">Undergraduate Degree</option><option value="Postgraduate">Postgraduate</option></optgroup></select><button type="button" onClick={()=>setGrade("")} className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground">Clear selection</button></label>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(s=><button key={s} onClick={()=>{setSubject(s); setQuery(s); goTo("ask")}} className={`rounded-xl border p-4 text-left hover:bg-muted ${subject===s ? "ring-2 ring-primary/20" : ""}`}><BookOpen className="mb-3 size-5 text-primary" /><div className="font-semibold">{s}</div><div className="mt-1 text-xs text-muted-foreground">Open this subject in Ask WIGOD</div></button>)}</div>
          </section>
        )}

        {section === "ask" && (
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3"><Brain className="size-5 text-primary" /><div><h2 className="font-semibold">Ask WIGOD</h2><p className="text-xs text-muted-foreground">Questions are answered from processed Knowledge Base sources.</p></div></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") askKnowledge()}} placeholder="Ask a question..." className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" /><button onClick={askKnowledge} disabled={asking || !query.trim()} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{asking ? "Thinking..." : "ASK"}</button></div>
            {tutorError && <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{tutorError}</div>}
            {tutorAnswer && <div className="mt-4 rounded-2xl bg-muted/30 p-5"><div className="font-semibold">WIGOD Answer</div><div className="mt-3 whitespace-pre-wrap text-sm leading-7">{tutorAnswer.answer}</div></div>}
          </section>
        )}

        {section === "research" && (
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><h2 className="font-semibold">Research</h2><p className="mt-1 text-xs text-muted-foreground">Search reusable source-linked knowledge and open it in the Archive.</p></div></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") goTo("archive")}} placeholder="Search research topics..." className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" /><button onClick={()=>goTo("archive")} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">SEARCH RESEARCH</button></div>
            <div className="mt-5 grid gap-3">{records.filter(r => !query || (r.title+" "+r.summary).toLowerCase().includes(query.toLowerCase())).slice(0,10).map(r=><button key={r.id} onClick={()=>{setQuery(r.title); goTo("ask")}} className="rounded-xl border p-4 text-left hover:bg-muted/40"><div className="font-semibold">{r.title}</div><div className="mt-1 text-xs text-muted-foreground">{r.summary}</div></button>)}{!records.length && <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">Process and generate Knowledge materials first to populate research results.</div>}</div>
          </section>
        )}

        {section === "voice" && (
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3"><Mic className="size-5 text-primary" /><div><h2 className="font-semibold">Voice</h2><p className="text-xs text-muted-foreground">Speak a question and WIGOD will send the recognised question to the Knowledge Tutor.</p></div></div>
            <button onClick={startVoice} disabled={listening} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Mic className="size-4" /> {listening ? "Listening..." : "Start Voice Question"}</button>
            {query && <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm"><span className="font-semibold">Recognised:</span> {query}</div>}
            {tutorError && <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{tutorError}</div>}
          </section>
        )}

        {section === "curriculum" && (
          <>
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold">Zimbabwe Curriculum Library</h2><p className="mt-1 text-xs text-muted-foreground">Expandable structure: ECD A/B → Grade 1–7 → Form 1–6 → Polytechnic → University.</p></div>
                <button onClick={()=>setSection("add")} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"><Plus className="size-4" /> Add subject/material</button>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={()=>changeLevel("preschool")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="preschool")}`}>Preschool</button>
                <button onClick={()=>changeLevel("primary")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="primary")}`}>Primary</button>
                <button onClick={()=>changeLevel("secondary")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="secondary")}`}>Secondary</button>
                <button onClick={()=>changeLevel("tertiary")} className={`rounded-xl px-4 py-2 text-sm font-medium ${active(level==="tertiary")}`}>Tertiary</button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  {grades.map(g=><button key={g} onClick={()=>setGrade(current => current===g ? "" : g)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${grade===g ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}>{g}<ChevronDown className="size-4 opacity-50" /></button>)}
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
            <section className="rounded-2xl bg-primary p-5 text-primary-foreground"><Sparkles className="size-6" /><h2 className="mt-4 text-xl font-semibold">Offline Knowledge Packs</h2><p className="mt-2 max-w-2xl text-sm opacity-90">Build downloadable, source-linked learning material for students with limited connectivity. Packs can later sync when internet returns.</p><button onClick={downloadKnowledgePack} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-semibold text-foreground"><Download className="size-4" /> Build Knowledge Pack</button></section>
          </>
        )}

        {section === "archive" && (
          <section className="rounded-2xl border bg-card">
            <div className="border-b px-5 py-5"><div className="flex items-center gap-3"><History className="size-5 text-primary" /><div><h2 className="font-semibold">Knowledge Archive</h2><p className="text-xs text-muted-foreground">Previously resolved questions, research and source-supported material become reusable knowledge.</p></div></div></div>
            <div className="divide-y">
              {records.filter(r => !query || (r.title + " " + r.summary).toLowerCase().includes(query.toLowerCase())).map(record=><div key={record.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><div className="font-medium">{record.title}</div><div className="mt-1 text-xs text-muted-foreground">{record.record_type} · {record.summary}</div></div><span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:block">{record.verification_status}</span><ArrowRight className="size-4 text-muted-foreground" /></div>)}
              {!records.length && filtered.map(([title,type,source,status])=><button key={title} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><BookOpen className="size-5" /></div><div className="min-w-0 flex-1"><div className="font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{type} · {source}</div></div><span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:block">{status}</span><ArrowRight className="size-4 text-muted-foreground" /></button>)}
              {!records.length && !filtered.length && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No knowledge records match your search.</div>}
            </div>
          </section>
        )}

        {section === "add" && (
          <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3"><Upload className="size-5 text-primary" /><div><h2 className="font-semibold">Add Curriculum or Academic Material</h2><p className="text-xs text-muted-foreground">Add authorised material and place it in the correct learning path.</p></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-2 block font-medium">Education level</span><select value={level} onChange={e=>changeLevel(e.target.value as EducationLevel)} className="w-full rounded-xl border bg-background px-3 py-2.5"><option value="preschool">Preschool</option><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="tertiary">Tertiary</option></select></label>
                <label className="text-sm"><span className="mb-2 block font-medium">Grade / Form</span><select value={grade} onChange={e=>setGrade(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5">{grades.map(g=><option key={g}>{g}</option>)}</select></label>
                <label className="text-sm sm:col-span-2"><span className="mb-2 block font-medium">Subject</span><select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5">{subjects.map(s=><option key={s}>{s}</option>)}<option>+ Add new subject</option></select></label>
                <label className="text-sm sm:col-span-2"><span className="mb-2 block font-medium">Material title</span><input value={fileName} onChange={e=>setFileName(e.target.value)} placeholder="e.g. Form 2 Mathematics syllabus" className="w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" /></label>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed p-6 text-center"><Upload className="mx-auto size-7 text-muted-foreground" /><div className="mt-2 text-sm font-medium">Choose a PDF, document or text file</div><div className="mt-1 text-xs text-muted-foreground">Next processing stage will extract text, identify topics and create source-linked knowledge.</div><input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" className="mx-auto mt-4 block max-w-full text-xs" onChange={e=>{const f=e.target.files?.[0] || null; setSelectedFile(f); setError(""); if(f) setFileName(f.name)}} />
              {selectedFile && <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-left text-xs"><span className="font-medium">{selectedFile.name}</span><span className="ml-2 text-muted-foreground">({(selectedFile.size/1024/1024).toFixed(2)} MB)</span></div>}</div>
              <button onClick={uploadMaterial} disabled={uploading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Upload className="size-4" /> {uploading ? "Uploading..." : "Queue for Knowledge Processing"}</button>
              {error&&<div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {added&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"><CheckCircle2 className="size-4" /> Material queued: {fileName||"untitled material"} · {grade} · {subject}</div>}
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Your Knowledge Materials</h2>
              <p className="mt-1 text-xs text-muted-foreground">Uploaded documents can now be processed into searchable source-linked chunks.</p>
              {documentError && <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{documentError}</div>}
              {processMessage && <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{processMessage}</div>}
              <div className="mt-4 space-y-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Review uploads, processing status and validation warnings.</div>
                <button onClick={refreshMaterials} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh"}</button>
              </div>
              {documents.length === 0 && <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">No uploaded materials yet.</div>}
                {documents.map(doc => {
                  const meta = doc.metadata || {}
                  const chunkCount = Number(meta.chunk_count || 0)
                  return <div key={doc.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{doc.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{doc.education_level || "Academic"} · {doc.syllabus_version || "—"} · {doc.subject || "Unmapped"}</div>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">{doc.processing_status}</span>
                    </div>
                    {chunkCount > 0 && <div className="mt-2 text-xs text-muted-foreground">{chunkCount} knowledge chunks · {String(meta.extracted_characters || 0)} extracted characters</div>}
                    {Array.isArray((doc.metadata || {}).validation_flags) && ((doc.metadata || {}).validation_flags as unknown[]).length > 0 && <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 px-3 py-3 text-xs text-orange-900"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> Review required — possible material mismatch</div><ul className="mt-1 list-disc pl-5">{((doc.metadata || {}).validation_flags as string[]).map((flag,i)=><li key={i}>{flag}</li>)}</ul><div className="mt-2 font-medium">The upload is not blocked. Investigate before relying on it for learning content.</div></div>}
                    {(doc.processing_status === "pending" || doc.processing_status === "failed" || doc.processing_status === "processed") && <button onClick={() => processDocument(doc.id)} disabled={processingId === doc.id} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">{processingId === doc.id ? "Processing..." : doc.processing_status === "processed" ? "Reprocess & clean" : "Process document"}</button>}
                    {doc.processing_status === "processed" && <button onClick={() => generateKnowledge(doc.id)} disabled={generatingId === doc.id} className="mt-3 ml-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60">{generatingId === doc.id ? "Generating..." : "Generate knowledge"}</button>}
                    {doc.processing_status === "processed" && <button onClick={() => generateAI(doc.id)} disabled={aiId === doc.id} className="mt-3 ml-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">{aiId === doc.id ? "AI working..." : "AI explain & quiz"}</button>}
                    <button onClick={() => deleteDocument(doc.id)} disabled={deletingId === doc.id} className="mt-3 ml-2 inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"><Trash2 className="size-3.5" /> {deletingId === doc.id ? "Deleting..." : "Delete"}</button>
                  </div>
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Processing pipeline</h2><div className="mt-5 space-y-4">{["Document intake","Text extraction","Topic & concept detection","Knowledge creation","Source verification","Archive & search"].map((step,i)=><div key={step} className="flex gap-3"><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i+1}</div><div><div className="text-sm font-medium">{step}</div><div className="mt-0.5 text-xs text-muted-foreground">{i<2?"Foundation stage":"Knowledge Engine stage"}</div></div></div>)}</div><div className="mt-6 rounded-xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">Only material you are authorised to store or distribute should be made public. Private institution or student materials remain access-controlled.</div></div>
          </section>
        )}
      </div>
    </main>
  )
}
