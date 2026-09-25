import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { getSessionUser, getProfileByUsername, getConversation, getMessageContacts, searchProfiles } from "@/lib/queries"
import { MessagesClient } from "@/components/messages-client"

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string; q?: string }> }) {
  const user=await getSessionUser()
  if(!user) redirect("/auth/login")
  const params=await searchParams
  const selectedUser=params.with?await (async()=>{const {createClient}=await import("@/lib/supabase/server");const s=await createClient();const {data}=await s.from("profiles").select("id,username,display_name,bio,avatar_url,created_at").eq("id",params.with).maybeSingle();return data})():null
  const [contacts,searchResults,messages]=await Promise.all([
    getMessageContacts(user.id),
    params.q?searchProfiles(params.q):Promise.resolve([]),
    selectedUser?getConversation(user.id,selectedUser.id):Promise.resolve([])
  ])
  return <div><PageHeader title="Messages" subtitle="Private conversations on WIGOD" /><MessagesClient currentUserId={user.id} selectedUser={selectedUser} messages={messages} contacts={contacts} searchResults={searchResults} searchTerm={params.q??""}/></div>
}
