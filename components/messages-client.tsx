"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sendMessage, markConversationRead } from "@/lib/actions"
import type { MessageRow, Profile } from "@/lib/types"

export function MessagesClient({ currentUserId, selectedUser, messages, contacts, searchResults, searchTerm }: {
  currentUserId:string; selectedUser:Profile|null; messages:MessageRow[]; contacts:Profile[]; searchResults:Profile[]; searchTerm:string
}) {
  const router=useRouter()
  const [content,setContent]=useState("")
  const [sending,setSending]=useState(false)
  const [error,setError]=useState("")
  useEffect(()=>{ if(selectedUser) markConversationRead(selectedUser.id) },[selectedUser?.id])
  async function submit(e:React.FormEvent){e.preventDefault();if(!selectedUser||!content.trim())return;setSending(true);setError("");const r=await sendMessage(selectedUser.id,content);setSending(false);if(!r.ok){setError(r.error);return}setContent("");router.refresh()}
  const people=searchTerm?searchResults:contacts
  return <div className="flex min-h-[calc(100dvh-5rem)] flex-col md:flex-row">
    <aside className="w-full shrink-0 border-b border-border md:w-80 md:border-b-0 md:border-r">
      <form className="p-3" action="/messages">
        <input name="q" defaultValue={searchTerm} placeholder="Search people to message..." className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30"/>
      </form>
      <div className="px-2 pb-3">
        {(people.length?people:<div className="px-3 py-6 text-sm text-muted-foreground">{searchTerm?"No people found.":"No conversations yet. Search for someone above."}</div>).map(p=>
          <button type="button" key={p.id} onClick={()=>router.push(`/messages?with=${encodeURIComponent(p.id)}`)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-secondary ${selectedUser?.id===p.id?"bg-secondary":""}`}>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-green/15 font-bold text-brand-green">{(p.display_name||p.username).slice(0,1).toUpperCase()}</div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{p.display_name||p.username}</div><div className="truncate text-xs text-muted-foreground">@{p.username}</div></div>
          </button>
        )}
      </div>
    </aside>
    <section className="flex min-h-[28rem] min-w-0 flex-1 flex-col">
      {!selectedUser?<div className="flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-lg font-semibold">Messages</h2><p className="mt-1 text-sm text-muted-foreground">Choose a conversation or search for a person to start messaging.</p></div></div>:
      <>
        <div className="border-b border-border px-4 py-3"><div className="font-semibold">{selectedUser.display_name||selectedUser.username}</div><div className="text-xs text-muted-foreground">@{selectedUser.username}</div></div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length?messages.map(m=><div key={m.id} className={`flex ${m.sender_id===currentUserId?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id===currentUserId?"bg-brand-green text-white":"bg-secondary"}`}>{m.content}</div></div>):<p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Send the first message.</p>}
        </div>
        <form onSubmit={submit} className="border-t border-border p-3">
          {error&&<p className="mb-2 text-sm text-brand-red">{error}</p>}
          <div className="flex gap-2"><input value={content} onChange={e=>setContent(e.target.value)} maxLength={2000} placeholder="Write a message..." className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30"/><button disabled={sending||!content.trim()} className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{sending?"Sending…":"Send"}</button></div>
        </form>
      </>}
    </section>
  </div>
}
