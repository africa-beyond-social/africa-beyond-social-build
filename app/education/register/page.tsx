"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react"

export default function EducationRegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<"student" | "teacher">("student")

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get("role")
    if (roleParam === "teacher") setRole("teacher")
  }, [])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [level, setLevel] = useState("primary")
  const [institution, setInstitution] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/education`,
        data: {
          display_name: name.trim(),
          education_role: role,
          education_level: role === "student" ? level : null,
          institution: institution.trim() || null,
          teacher_verification_status: role === "teacher" ? "pending" : null,
        },
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    router.push("/auth/sign-up-success?next=/education/login")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/education" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Education Hub</Link>
        <section className="mt-5 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700"><BookOpen className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold">Create your Education Hub account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Register as a student or teacher. Confirm your email before signing in.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole("student")} className={`rounded-xl border p-3 text-left ${role === "student" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}><GraduationCap className="mb-2 h-5 w-5" /><span className="block font-semibold">Student</span><span className="text-xs text-muted-foreground">Learn and study</span></button>
              <button type="button" onClick={() => setRole("teacher")} className={`rounded-xl border p-3 text-left ${role === "teacher" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}><BookOpen className="mb-2 h-5 w-5" /><span className="block font-semibold">Teacher</span><span className="text-xs text-muted-foreground">Teach and support</span></button>
            </div>
            <label className="block text-sm font-medium">Full name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="Your full name" /></label>
            <label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="you@example.com" /></label>
            {role === "student" ? <label className="block text-sm font-medium">Education level<select value={level} onChange={e=>setLevel(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5"><option value="primary">Primary school — $3/month</option><option value="secondary">Secondary school — $5/month</option><option value="tertiary">Tertiary education — $7/month</option></select></label> : <label className="block text-sm font-medium">School or institution (optional)<input value={institution} onChange={e=>setInstitution(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="Name of school or institution" /></label>}
            <label className="block text-sm font-medium">Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="At least 8 characters" /></label>
            {role === "teacher" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Teacher accounts are marked as pending verification. Registration alone does not grant verified-teacher status or privileged access.</p>}
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{loading ? "Creating account…" : `Register as ${role === "student" ? "student" : "teacher"}`}</button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">Already registered? <Link href={`/education/login?role=${role}`} className="font-semibold underline underline-offset-4">Log in</Link></p>
        </section>
      </div>
    </main>
  )
}
