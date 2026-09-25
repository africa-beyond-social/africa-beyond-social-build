import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getSessionUser, searchProfiles } from "@/lib/queries"
import { MessageCircle, User } from "lucide-react"
import { MessageComposer } from "@/components/message-composer"

type MessageRow={id:string;sender_id:string;recipient_id:string;content:string;created_at:string;read_at:string|null}
type ProfileRow={id:string;username:string;display_name:string|null;avatar_url:string|null}

export default async function MessagesPage({searchParams}:{searchParams:Promise<{with?:string;q?:string}>}) {
 const user=await getSessionUser(); if(!user) redirect("/auth/login")
 const supabase=await createClient(); const params=await searchParams
 const searchTerm=params.q?.trim()??""
 const searchResults=searchTerm?(await searchProfiles(searchTerm)).filter(p=>p.id!==user.id):[]
 const {data:rows}=await supabase.from("messages").select("id,sender_id,recipient_id,content,created_at,read_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(200)
 const messages=(rows as MessageRow[]|null)??[]
 const ids=Array.from(new Set(messages.map(m=>m.sender_id===user.id?m.recipient_id:m.sender_id)))
 const {data:ps}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[] as ProfileRow[]}
 const byId=new Map<string,ProfileRow>(); for(const p of (ps as ProfileRow[]|null)??[]) byId.set(p.id,p)
 const conversations=new Map<string,MessageRow[]>()
 for(const m of [...messages].reverse()){const id=m.sender_id===user.id?m.recipient_id:m.sender_id;const list=conversations.get(id)??[];list.push(m);conversations.set(id,list)}
 let selected:ProfileRow|undefined=params.with?Array.from(byId.values()).find(p=>p.username.toLowerCase()===params.with!.toLowerCase()):undefined
 if(params.with&&!selected){const {data}=await supabase.from("profiles").select("id,username,display_name,avatar_url").ilike("username",params.with).maybeSingle();selected=(data as ProfileRow|null)??undefined}
 const selectedMessages=selected?conversations.get(selected.id)??[]:[]
 return <div className="mx-auto w-full max-w-3xl">
  <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur"><div className="flex items-center gap-3"><MessageCircle className="size-6 text-brand-green"/><div><h1 className="text-xl font-bold">Messages</h1><p className="text-sm text-muted-foreground">Private conversations on WIGOD.</p></div></div><form action="/messages" method="get" className="mt-4 flex gap-2"><input name="q" defaultValue={searchTerm} placeholder="Find someone to message..." className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green"/><button type="submit" className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white">Search</button></form></header>
  {searchTerm&&!selected?<section className="divide-y divide-border border-b border-border">{searchResults.length?searchResults.map(p=><Link key={p.id} href={`/messages?with=${encodeURIComponent(p.username)}`} className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary"><User className="size-5 text-muted-foreground"/></div><div><div className="font-semibold">{p.display_name??p.username}</div><div className="text-sm text-muted-foreground">@{p.username}</div></div></Link>):<div className="px-4 py-6 text-sm text-muted-foreground">No people found for “{searchTerm}”.</div>}</section>:null}
  {selected?<section className="p-4">
   <div className="mb-4 flex items-center gap-3 rounded-xl border border-border p-3"><div className="flex size-10 items-center justify-center rounded-full bg-secondary"><User className="size-5 text-muted-foreground"/></div><div><div className="font-semibold">{selected.display_name??selected.username}</div><div className="text-sm text-muted-foreground">@{selected.username}</div></div></div>
   <div className="space-y-2">{selectedMessages.map(m=><div key={m.id} className={`flex ${m.sender_id===user.id?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_id===user.id?"bg-brand-green text-white":"bg-secondary"}`}><p className="whitespace-pre-wrap">{m.content}</p><time className="mt-1 block text-[0.7rem] opacity-70">{new Date(m.created_at).toLocaleString()}</time></div></div>)}</div>
   <div className="mt-4"><Link href="/messages" className="text-sm text-muted-foreground hover:underline">← Back to messages</Link></div><MessageComposer recipientId={selected.id}/>
  </section>:<section className="divide-y divide-border">
   {Array.from(conversations.entries()).map(([id,list])=>{const other=byId.get(id);if(!other)return null;const latest=list[list.length-1];const unread=list.some(m=>m.recipient_id===user.id&&!m.read_at);return <Link key={id} href={`/messages?with=${encodeURIComponent(other.username)}`} className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary"><User className="size-5 text-muted-foreground"/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{other.display_name??other.username}</span><time className="text-xs text-muted-foreground">{new Date(latest.created_at).toLocaleDateString()}</time></div><p className={`truncate text-sm ${unread?"font-semibold text-foreground":"text-muted-foreground"}`}>{latest.content}</p></div></Link>})}
   {conversations.size===0&&<div className="flex min-h-[55dvh] flex-col items-center justify-center px-6 text-center"><MessageCircle className="mb-4 size-12 text-muted-foreground"/><h2 className="text-lg font-semibold">No messages yet</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">Private conversations will appear here when you start messaging people on WIGOD.</p></div>}
  </section>}
 </div>
}