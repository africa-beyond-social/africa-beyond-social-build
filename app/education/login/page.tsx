"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, BookOpen } from "lucide-react"

export default function EducationLoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<"student" | "teacher">("student")

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get("role")
    if (roleParam === "teacher") setRole("teacher")
  }, [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError || !data.user) {
      const message = signInError?.message.toLowerCase() ?? ""
      setError(message.includes("confirm") ? "Please confirm your email address before signing in." : "We couldn't sign you in with those details.")
      setLoading(false)
      return
    }
    const savedRole = data.user.user_metadata?.education_role
    if (savedRole !== role) {
      await supabase.auth.signOut()
      setError(savedRole === "student" || savedRole === "teacher" ? `This account is registered as a ${savedRole}. Choose the matching login option.` : "This account is not registered for Education Hub access. Please register for the Education Hub first.")
      setLoading(false)
      return
    }
    router.push("/knowledge")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/education" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Education Hub</Link>
        <section className="mt-5 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700"><BookOpen className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold">Sign in to Education Hub</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose the account type you registered with.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole("student")} className={`rounded-xl border p-3 text-left ${role === "student" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}><span className="block font-semibold">Student login</span><span className="text-xs text-muted-foreground">Student account</span></button>
              <button type="button" onClick={() => setRole("teacher")} className={`rounded-xl border p-3 text-left ${role === "teacher" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}><span className="block font-semibold">Teacher login</span><span className="text-xs text-muted-foreground">Teacher account</span></button>
            </div>
            <label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="you@example.com" /></label>
            <label className="block text-sm font-medium">Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5" placeholder="Your password" /></label>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{loading ? "Signing in…" : `Sign in as ${role}`}</button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">New to Education Hub? <Link href={`/education/register?role=${role}`} className="font-semibold underline underline-offset-4">Register here</Link></p>
          <p className="mt-3 text-center text-sm"><Link href="/auth/reset-password" className="text-muted-foreground underline underline-offset-4">Forgot password?</Link></p>
        </section>
      </div>
    </main>
  )
}
