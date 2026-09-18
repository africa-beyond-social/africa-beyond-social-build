import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const categories = ["News & Current Affairs", "Business & Enterprise", "Culture & Heritage", "Faith & Belief", "Sports", "Technology", "Creators & Media", "Local Communities"]

export default function CreateCommunityPage() {
  return (
    <div>
      <PageHeader title="CREATE COMMUNITY" subtitle="Build a space for people to connect on WIGOD." />
      <div className="px-4 py-5">
        <Link href="/community" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to Communities</Link>
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-accent text-brand-green"><Users className="size-5" /></div><div><h2 className="font-serif text-lg font-bold">Start a WIGOD community</h2><p className="text-xs text-muted-foreground">Give people a dedicated place to share and connect.</p></div></div>
          <form action="/api/community/create" method="post" className="mt-5 space-y-4">
            <div><label htmlFor="name" className="text-xs font-semibold">Community name</label><input id="name" name="name" required maxLength={80} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" placeholder="e.g. Zimbabwe Creators" /></div>
            <div><label htmlFor="description" className="text-xs font-semibold">Description</label><textarea id="description" name="description" maxLength={240} rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" placeholder="What is this community about?" /></div>
            <div><label htmlFor="category" className="text-xs font-semibold">Category</label><select id="category" name="category" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
            <button type="submit" className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">Create community</button>
          </form>
        </div>
      </div>
    </div>
  )
}
