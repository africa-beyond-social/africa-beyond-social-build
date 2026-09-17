import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

export type ConversationSummary = {
  id: string
  updated_at: string
  other: Profile
  last_message: { content: string; created_at: string; sender_id: string } | null
  unread: boolean
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  attachment_size: number | null
  created_at: string
  updated_at: string
}

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId)
  if (!memberships?.length) return []

  const ids = memberships.map((m) => m.conversation_id)
  const { data: members } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", ids)
    .neq("user_id", userId)
  const otherIds = Array.from(new Set((members ?? []).map((m) => m.user_id)))
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, username, display_name, bio, avatar_url, created_at").in("id", otherIds)
    : { data: [] as Profile[] }
  const profileById = new Map((profiles as Profile[]).map((p) => [p.id, p]))
  const otherByConversation = new Map<string, string>()
  for (const m of members ?? []) otherByConversation.set(m.conversation_id, m.user_id)

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, sender_id")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
  const lastByConversation = new Map<string, { content: string; created_at: string; sender_id: string }>()
  for (const m of lastMessages ?? []) if (!lastByConversation.has(m.conversation_id)) lastByConversation.set(m.conversation_id, m)

  const { data: conversations } = await supabase.from("conversations").select("id, updated_at").in("id", ids)
  const readByConversation = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at as string | null]))

  return (conversations ?? [])
    .map((c) => {
      const other = profileById.get(otherByConversation.get(c.id) ?? "")
      if (!other) return null
      const last = lastByConversation.get(c.id) ?? null
      const readAt = readByConversation.get(c.id)
      return { id: c.id, updated_at: c.updated_at, other, last_message: last, unread: Boolean(last && last.sender_id !== userId && (!readAt || new Date(last.created_at) > new Date(readAt))) }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime()) as ConversationSummary[]
}

export async function getConversation(conversationId: string, userId: string) {
  const supabase = await createClient()
  const { data: membership } = await supabase.from("conversation_members").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", userId).maybeSingle()
  if (!membership) return null
  const { data: members } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId).neq("user_id", userId)
  const otherId = members?.[0]?.user_id
  if (!otherId) return null
  const { data: other } = await supabase.from("profiles").select("id, username, display_name, bio, avatar_url, created_at").eq("id", otherId).maybeSingle()
  if (!other) return null
  const { data: messages } = await supabase.from("messages").select("id, conversation_id, sender_id, content, attachment_url, attachment_name, attachment_type, attachment_size, created_at, updated_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200)
  return { other: other as Profile, messages: (messages as MessageRow[] | null) ?? [] }
}
