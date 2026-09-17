import { createClient } from "@/lib/supabase/server"

export type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  creator_id: string | null
  created_at: string
  member_count: number
  joined_by_me: boolean
}

export async function getCommunities(currentUserId: string | null, limit = 30): Promise<Community[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("communities").select("id,name,slug,description,category,creator_id,created_at").order("created_at", { ascending: false }).limit(limit)
  if (error || !data?.length) return []
  const ids = data.map((c) => c.id)
  const { data: members } = await supabase.from("community_members").select("community_id,user_id").in("community_id", ids)
  const counts = new Map<string, number>()
  const joined = new Set<string>()
  for (const member of members ?? []) {
    counts.set(member.community_id, (counts.get(member.community_id) ?? 0) + 1)
    if (currentUserId && member.user_id === currentUserId) joined.add(member.community_id)
  }
  return data.map((community) => ({ ...community, member_count: counts.get(community.id) ?? 0, joined_by_me: joined.has(community.id) })) as Community[]
}
