"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, ShieldCheck, Sparkles } from "lucide-react"

const plans = [
  { id: "primary", title: "Primary School", grades: "ECD A/B to Grade 7", price: "$3", description: "Accessible learning support for young learners and their families.", features: ["Curriculum-aligned learning support", "Study guides and assignment help", "Age-appropriate research guidance"], icon: BookOpen, accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { id: "secondary", title: "Secondary School", grades: "Forms 1–6", price: "$5", description: "More support for subjects, revision and independent study.", features: ["Subject-focused study support", "Exam revision and practice", "Research and assignment planning"], icon: GraduationCap, accent: "bg-blue-500/10 text-blue-700 dark:text-blue-300", popular: true },
  { id: "tertiary", title: "Tertiary Education", grades: "Polytechnic and university", price: "$7", description: "Academic research guidance for higher and professional learning.", features: ["Research planning and guidance", "Module and topic study support", "Academic writing assistance"], icon: Sparkles, accent: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
]

export default function EducationBillingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"><Sparkles className="h-4 w-4 text-emerald-600" /> WIGOD Education Hub</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Learning that helps fund better learning.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">Choose a plan for your education level. Every plan starts with a 30-day free trial, followed by a simple monthly subscription.</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> 30 days free · Monthly billing · Cancel any time</div>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <section key={plan.id} className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm ${plan.popular ? "border-emerald-500 ring-1 ring-emerald-500/30" : ""}`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Popular choice</span>}
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${plan.accent}`}><Icon className="h-6 w-6" /></div>
              <h2 className="mt-5 text-xl font-semibold">{plan.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.grades}</p>
              <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold tracking-tight">{plan.price}</span><span className="text-sm text-muted-foreground">/ month</span></div>
              <p className="mt-3 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></li>)}</ul>
              <Link href="/education/register?role=student" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Register for free trial <ArrowRight className="h-4 w-4" /></Link>
            </section>
          )
        })}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Clear and secure billing</div><p className="mt-2 text-sm text-muted-foreground">Paid access will only activate after the payment provider confirms a transaction securely. No annual plan is offered at launch.</p></div>
        <div className="rounded-2xl border p-5"><div className="flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-emerald-600" /> Help support education</div><p className="mt-2 text-sm text-muted-foreground">Subscriptions help fund the ongoing development and operation of WIGOD Education Hub. Sponsored access can be added for learners who need support.</p></div>
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">Student and teacher registration are available through the Education Hub access portal. Trial activation and checkout will be enabled after the payment provider is configured and the subscription database migration is applied. Prices are in US dollars.</p>
    </div>
  )
}
