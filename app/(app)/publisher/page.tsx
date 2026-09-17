import Link from "next/link"
import { BarChart3, CalendarClock, FileText, Image, LayoutTemplate, PenSquare, Radio, Send, Video } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const tools = [
  { title: "Create a post", description: "Publish text, photos and conversations to your social feed.", icon: PenSquare, href: "/" },
  { title: "Publish video", description: "Prepare short-form video and media for your audience.", icon: Video, href: "/media" },
  { title: "Schedule content", description: "Plan publishing dates and keep your content calendar organised.", icon: CalendarClock, href: "#calendar" },
  { title: "Live Studio", description: "Create a live programme and manage your presenter feed.", icon: Radio, href: "/live/studio" },
  { title: "Media library", description: "Organise the visual assets you use across your publishing workflow.", icon: Image, href: "/media" },
  { title: "Analytics", description: "A future home for reach, views, engagement and audience insights.", icon: BarChart3, href: "#analytics" },
]

export default function PublisherPage() {
  return (
    <div>
      <PageHeader title="Publisher" subtitle="Create, organise and publish content across Africa & Beyond Social." />
      <div className="space-y-5 px-4 py-5 md:px-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Creator publishing</p>
          <h1 className="mt-1 font-serif text-2xl font-bold">Your publishing workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">One place for social posts, media, scheduling and live production. The platform identity remains social-first while giving creators professional publishing tools.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Link href="/" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold text-white"><Send className="size-4" /> Publish a post</Link><Link href="/live/studio" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold"><Radio className="size-4" /> Open Live Studio</Link></div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tools.map(({ title, description, icon: Icon, href }) => <Link key={title} href={href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary"><Icon className="size-5 text-brand-red" /><h2 className="mt-3 text-sm font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></Link>)}
        </section>

        <section id="calendar" className="rounded-2xl border border-border p-5"><div className="flex items-center gap-2"><LayoutTemplate className="size-5 text-brand-green" /><h2 className="text-base font-bold">Content calendar</h2></div><p className="mt-2 text-xs text-muted-foreground">Scheduling infrastructure is reserved here for the next publishing iteration. Nothing is automatically published without creator action.</p><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-secondary p-3 text-xs"><strong>Drafts</strong><p className="mt-1 text-muted-foreground">Keep work in progress organised.</p></div><div className="rounded-xl bg-secondary p-3 text-xs"><strong>Scheduled</strong><p className="mt-1 text-muted-foreground">Prepare future publishing slots.</p></div><div className="rounded-xl bg-secondary p-3 text-xs"><strong>Published</strong><p className="mt-1 text-muted-foreground">Review your publishing history.</p></div></div></section>

        <section id="analytics" className="rounded-2xl border border-dashed border-border p-5"><div className="flex items-center gap-2"><FileText className="size-5 text-muted-foreground" /><h2 className="text-base font-bold">Creator analytics</h2></div><p className="mt-2 text-xs text-muted-foreground">The analytics surface will connect to real post, video and live metrics as those creator systems mature.</p></section>
      </div>
    </div>
  )
}
