import Link from "next/link"
import { Mail, MessageCircle, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { UserAvatar } from "@/components/user-avatar"
import { getConversations } from "@/lib/messages"
import { getSessionUser } from "@/lib/queries"

export default async function MessagesPage() {
  const user = await getSessionUser()
  if (!user) return <div className="p-6 text-sm text-muted-foreground">Sign in to use Messages.</div>
  const conversations = await getConversations(user.id)
  return (
    <div>
      <PageHeader title="MESSAGES" subtitle="Private conversations across Africa & Beyond" />
      <div className="grid min-h-[70vh] md:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Search messages" className="w-full rounded-full border border-border bg-secondary/40 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-green" /></div></div>
          {conversations.length === 0 ? <div className="flex flex-col items-center px-6 py-12 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Mail className="size-6" /></span><h2 className="mt-4 font-serif text-lg font-bold">Your conversations</h2><p className="mt-2 max-w-xs text-sm text-muted-foreground">Message someone from their profile. Your private conversations will appear here.</p><Link href="/explore" className="mt-5 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold text-white">Find people</Link></div> : <div>{conversations.map((conversation) => <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex items-center gap-3 border-b border-border px-4 py-3 hover:bg-secondary/40"><UserAvatar displayName={conversation.other.display_name} username={conversation.other.username} avatarUrl={conversation.other.avatar_url} className="size-11" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{conversation.other.display_name ?? conversation.other.username}</p>{conversation.unread && <span className="size-2 shrink-0 rounded-full bg-brand-green" />}</div><p className="truncate text-sm text-muted-foreground">{conversation.last_message?.content ?? "Start the conversation"}</p></div></Link>)}</div>}
        </aside>
        <section className="hidden items-center justify-center md:flex"><div className="max-w-sm px-6 text-center"><MessageCircle className="mx-auto size-10 text-brand-green" /><h2 className="mt-4 font-serif text-xl font-bold">Select a conversation</h2><p className="mt-2 text-sm text-muted-foreground">Your private messages will appear here.</p></div></section>
      </div>
    </div>
  )
}
