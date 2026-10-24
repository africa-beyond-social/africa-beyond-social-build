"use client"

import Link from "next/link"
import { BookOpen, GraduationCap, ArrowRight, Users, ShieldCheck } from "lucide-react"

export default function EducationAccessPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700"><BookOpen className="h-7 w-7" /></div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">WIGOD Education Hub</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Learning starts with you.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Choose your access pathway. Students and teachers have separate registration and login journeys designed for their needs.</p>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700"><GraduationCap className="h-6 w-6" /></div>
            <h2 className="mt-5 text-2xl font-semibold">Student access</h2>
            <p className="mt-2 text-sm text-muted-foreground">Register to choose your education level, access learning support and start the 30-day trial when subscriptions are enabled.</p>
            <ul className="mt-5 space-y-2 text-sm"><li>• Primary — $3/month</li><li>• Secondary — $5/month</li><li>• Tertiary — $7/month</li></ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/education/register?role=student" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Student registration <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/education/login?role=student" className="inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold">Student login</Link>
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700"><Users className="h-6 w-6" /></div>
            <h2 className="mt-5 text-2xl font-semibold">Teacher access</h2>
            <p className="mt-2 text-sm text-muted-foreground">Create a teacher account to prepare learning resources and support students. Teacher accounts may require verification before educator-only tools are enabled.</p>
            <div className="mt-5 rounded-xl bg-muted/60 p-3 text-sm"><ShieldCheck className="mr-2 inline h-4 w-4" /> Teacher registration is not automatic proof of professional status.</div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/education/register?role=teacher" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Teacher registration <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/education/login?role=teacher" className="inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold">Teacher login</Link>
            </div>
          </section>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Already have a WIGOD Education account? <Link className="font-semibold underline underline-offset-4" href="/education/login">Sign in here</Link>.</p>
      </div>
    </main>
  )
}
