"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { markConversationRead, sendMessage } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import type { MessageRow } from "@/lib/messages"
import type { Profile } from "@/lib/types"

export function MessageThread({ conversationId, currentUserId, other, initialMessages }: { conversationId: string; currentUserId: string; other: Profile; initialMessages: MessageRow[] }) {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void markConversationRead(conversationId)
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    const timer = window.setInterval(() => router.refresh(), 5000)
    return () => window.clearInterval(timer)
  }, [conversationId, router])

  async function submit() {
    const text = content.trim()
    if (!text || pending) return
    startTransition(async () => {
      const result = await sendMessage(conversationId, text)
      if (!result.ok) { toast.error(result.error); return }
      setContent("")
      router.refresh()
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    })
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <UserAvatar displayName={other.display_name} username={other.username} avatarUrl={other.avatar_url} className="size-10" />
        <div className="min-w-0"><p className="truncate font-semibold">{other.display_name ?? other.username}</p><p className="truncate text-xs text-muted-foreground">@{other.username}</p></div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {initialMessages.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">Start the conversation with @{other.username}.</div>}
        {initialMessages.map((message) => {
          const mine = message.sender_id === currentUserId
          return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-md bg-brand-green text-white" : "rounded-bl-md bg-secondary text-foreground"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p>{message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">{message.attachment_name ?? "Attachment"}</a>}<p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3"><div className="flex items-end gap-2"><textarea value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit() } }} rows={1} maxLength={4000} placeholder="Write a message…" className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm outline-none focus:border-brand-green" aria-label="Message" /><Button onClick={() => void submit()} disabled={!content.trim() || pending} className="size-11 rounded-full p-0" aria-label="Send message"><Send className="size-4" /></Button></div><p className="mt-1 px-2 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p></div>
    </div>
  )
}
