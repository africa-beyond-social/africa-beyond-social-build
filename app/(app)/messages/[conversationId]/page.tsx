import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getConversation } from "@/lib/messages"
import { getSessionUser } from "@/lib/queries"
import { MessageThread } from "@/components/message-thread"

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const user = await getSessionUser()
  if (!user) return <div className="p-6 text-sm text-muted-foreground">Sign in to use Messages.</div>
  const conversation = await getConversation(conversationId, user.id)
  if (!conversation) return <div className="p-6"><Link href="/messages" className="inline-flex items-center gap-2 text-sm text-brand-green hover:underline"><ArrowLeft className="size-4" />Back to Messages</Link><p className="mt-8 text-sm text-muted-foreground">Conversation not found.</p></div>

  return <div><div className="border-b border-border px-4 py-3"><Link href="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Messages</Link></div><MessageThread conversationId={conversationId} currentUserId={user.id} other={conversation.other} initialMessages={conversation.messages} /></div>
}
