import Link from "next/link"
import { Mail, Search, MessageCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export default function MessagesPage() {
  return (
    <div>
      <PageHeader title="MESSAGES" subtitle="Private conversations across Africa & Beyond" />
      <div className="grid min-h-[70vh] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search messages" className="w-full rounded-full border border-border bg-secondary/40 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-green" />
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Mail className="size-6" /></span>
            <h2 className="mt-4 font-serif text-lg font-bold">Your conversations</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Start a private conversation with someone from their profile or when messaging becomes available.</p>
          </div>
        </aside>
        <section className="hidden items-center justify-center md:flex">
          <div className="max-w-sm px-6 text-center">
            <MessageCircle className="mx-auto size-10 text-brand-green" />
            <h2 className="mt-4 font-serif text-xl font-bold">Select a conversation</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your private messages will appear here.</p>
            <Link href="/explore" className="mt-5 inline-flex rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold text-white">Find people to message</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
