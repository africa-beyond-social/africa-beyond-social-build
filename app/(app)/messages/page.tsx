import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/queries"
import { MessageCircle, User } from "lucide-react"
import { MessageComposer } from "@/components/message-composer"

type MessageRow={id:string;sender_id:string;recipient_id:string;content:string;created_at:string;read_at:string|null}
type ProfileRow={id:string;username:string;display_name:string|null;avatar_url:string|null}

export default async function MessagesPage({searchParams}:{searchParams:Promise<{with?:string}>}) {
 const user=await getSessionUser(); if(!user) redirect("/auth/login")
 const supabase=await createClient(); const params=await searchParams
 const {data:rows}=await supabase.from("messages").select("id,sender_id,recipient_id,content,created_at,read_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(200)
 const messages=(rows as MessageRow[]|null)??[]
 const ids=Array.from(new Set(messages.map(m=>m.sender_id===user.id?m.recipient_id:m.sender_id)))
 const {data:ps}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[] as ProfileRow[]}
 const byId=new Map<string,ProfileRow>(); for(const p of (ps as ProfileRow[]|null)??[]) byId.set(p.id,p)
 const conversations=new Map<string,MessageRow[]>()
 for(const m of [...messages].reverse()){const id=m.sender_id===user.id?m.recipient_id:m.sender_id;const list=conversations.get(id)??[];list.push(m);conversations.set(id,list)}
 const selected=params.with?Array.from(byId.values()).find(p=>p.username===params.with):undefined
 const selectedMessages=selected?conversations.get(selected.id)??[]:[]
 return <div className="mx-auto w-full max-w-3xl">
  <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur"><div className="flex items-center gap-3"><MessageCircle className="size-6 text-brand-green"/><div><h1 className="text-xl font-bold">Messages</h1><p className="text-sm text-muted-foreground">Private conversations on WIGOD.</p></div></div></header>
  {selected?<section className="p-4">
   <div className="mb-4 flex items-center gap-3 rounded-xl border border-border p-3"><div className="flex size-10 items-center justify-center rounded-full bg-secondary"><User className="size-5 text-muted-foreground"/></div><div><div className="font-semibold">{selected.display_name??selected.username}</div><div className="text-sm text-muted-foreground">@{selected.username}</div></div></div>
   <div className="space-y-2">{selectedMessages.map(m=><div key={m.id} className={`flex ${m.sender_id===user.id?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_id===user.id?"bg-brand-green text-white":"bg-secondary"}`}><p className="whitespace-pre-wrap">{m.content}</p><time className="mt-1 block text-[0.7rem] opacity-70">{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div>
   <MessageComposer recipientId={selected.id}/>
  </section>:<section className="divide-y divide-border">
   {Array.from(conversations.entries()).map(([id,list])=>{const other=byId.get(id);if(!other)return null;const latest=list[list.length-1];const unread=list.some(m=>m.recipient_id===user.id&&!m.read_at);return <Link key={id} href={`/messages?with=${encodeURIComponent(other.username)}`} className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary"><User className="size-5 text-muted-foreground"/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{other.display_name??other.username}</span><time className="text-xs text-muted-foreground">{new Date(latest.created_at).toLocaleDateString()}</time></div><p className={`truncate text-sm ${unread?"font-semibold text-foreground":"text-muted-foreground"}`}>{latest.content}</p></div></Link>})}
   {conversations.size===0&&<div className="flex min-h-[55dvh] flex-col items-center justify-center px-6 text-center"><MessageCircle className="mb-4 size-12 text-muted-foreground"/><h2 className="text-lg font-semibold">No messages yet</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">Private conversations will appear here when you start messaging people on WIGOD.</p></div>}
  </section>}
 </div>
}