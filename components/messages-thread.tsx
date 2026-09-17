"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { ArrowLeft, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { sendMessage, markConversationRead } from "@/lib/actions"
import type { MessageRow } from "@/lib/messages"
import type { Profile } from "@/lib/types"

export function MessagesThread({ conversationId, currentUserId, other, initialMessages }: { conversationId: string; currentUserId: string; other: Profile; initialMessages: MessageRow[] }) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [content, setContent] = useState("")
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markConversationRead(conversationId); bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior }) }, [conversationId])
  function submit() {
    const text = content.trim()
    if (!text || pending) return
    setContent("")
    startTransition(async () => {
      const result = await sendMessage(conversationId, text)
      if (!result.ok) { setContent(text); toast.error(result.error); return }
      setMessages((items) => [...items, { id: crypto.randomUUID(), conversation_id: conversationId, sender_id: currentUserId, content: text, attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0)
      router.refresh()
    })
  }
  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => router.push("/messages")} className="rounded-full p-2 hover:bg-secondary" aria-label="Back to messages"><ArrowLeft className="size-5" /></button>
        <UserAvatar displayName={other.display_name} username={other.username} avatarUrl={other.avatar_url} className="size-9" />
        <div className="min-w-0"><p className="truncate font-semibold">{other.display_name ?? other.username}</p><p className="text-xs text-muted-foreground">@{other.username}</p></div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {messages.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Start the conversation.</p>}
        {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${message.sender_id === currentUserId ? "rounded-br-md bg-brand-green text-white" : "rounded-bl-md bg-secondary"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p></div></div>)}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3"><div className="flex items-end gap-2"><textarea value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }} rows={1} maxLength={4000} placeholder="Write a message…" className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm outline-none focus:border-brand-green" /><Button onClick={submit} disabled={!content.trim() || pending} size="icon" className="size-11 rounded-full" aria-label="Send message"><Send className="size-4" /></Button></div><p className="mt-1 text-right text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p></div>
    </div>
  )
}
