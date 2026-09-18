import { createClient } from "@/lib/supabase/server"
import type { Comment, FeedPost, NotificationRow, Post, Profile } from "@/lib/types"

type PostRow = Pick<Post, "id" | "user_id" | "content" | "image_url" | "video_url" | "created_at" | "updated_at">

type Enrichment = {
  author: Profile
  like_count: number
  reply_count: number
  repost_count: number
  liked_by_me: boolean
  reposted_by_me: boolean
}

const EMPTY_PROFILE = (id: string): Profile => ({
  id,
  username: "unknown",
  display_name: "Unknown user",
  bio: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
})

async function enrichPosts(postRows: PostRow[], currentUserId: string | null): Promise<Map<string, Enrichment>> {
  const result = new Map<string, Enrichment>()
  if (postRows.length === 0) return result

  const supabase = await createClient()
  const postIds = postRows.map((p) => p.id)
  const authorIds = Array.from(new Set(postRows.map((p) => p.user_id)))

  const [profilesRes, likesRes, commentsRes, repostsRes] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, bio, avatar_url, created_at").in("id", authorIds),
    supabase.from("likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    supabase.from("reposts").select("post_id, user_id").in("post_id", postIds),
  ])

  const profileById = new Map<string, Profile>()
  for (const p of (profilesRes.data as Profile[] | null) ?? []) profileById.set(p.id, p)

  const likeCount = new Map<string, number>()
  const likedByMe = new Set<string>()
  for (const l of likesRes.data ?? []) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1)
    if (currentUserId && l.user_id === currentUserId) likedByMe.add(l.post_id)
  }

  const replyCount = new Map<string, number>()
  for (const c of commentsRes.data ?? []) replyCount.set(c.post_id, (replyCount.get(c.post_id) ?? 0) + 1)

  const repostCount = new Map<string, number>()
  const repostedByMe = new Set<string>()
  for (const r of repostsRes.data ?? []) {
    repostCount.set(r.post_id, (repostCount.get(r.post_id) ?? 0) + 1)
    if (currentUserId && r.user_id === currentUserId) repostedByMe.add(r.post_id)
  }

  for (const row of postRows) {
    result.set(row.id, {
      author: profileById.get(row.user_id) ?? EMPTY_PROFILE(row.user_id),
      like_count: likeCount.get(row.id) ?? 0,
      reply_count: replyCount.get(row.id) ?? 0,
      repost_count: repostCount.get(row.id) ?? 0,
      liked_by_me: likedByMe.has(row.id),
      reposted_by_me: repostedByMe.has(row.id),
    })
  }

  return result
}

function toFeedPost(row: PostRow, e: Enrichment, repostedBy?: FeedPost["reposted_by"]): FeedPost {
  return {
    id: row.id,
    content: row.content,
    image_url: row.image_url,
    video_url: row.video_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: e.author,
    like_count: e.like_count,
    reply_count: e.reply_count,
    repost_count: e.repost_count,
    liked_by_me: e.liked_by_me,
    reposted_by_me: e.reposted_by_me,
    reposted_by: repostedBy ?? null,
  }
}

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle()
  return (data as Profile | null) ?? null
}

export async function getHomeFeed(userId: string): Promise<FeedPost[]> {
  const supabase = await createClient()
  const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId)
  const scope = Array.from(new Set([userId, ...(follows?.map((f) => f.following_id) ?? [])]))

  const [{ data: posts }, { data: reposts }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, user_id, content, image_url, video_url, created_at, updated_at")
      .in("user_id", scope)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("reposts")
      .select("post_id, user_id, created_at")
      .in("user_id", scope)
      .order("created_at", { ascending: false })
      .limit(40),
  ])

  const postRows = (posts as PostRow[] | null) ?? []
  const repostRows = reposts ?? []
  const knownIds = new Set(postRows.map((p) => p.id))
  const missingIds = Array.from(new Set(repostRows.map((r) => r.post_id))).filter((id) => !knownIds.has(id))

  let extraPosts: PostRow[] = []
  const reposterIds = Array.from(new Set(repostRows.map((r) => r.user_id)))
  const reposterProfiles = new Map<string, Profile>()

  if (missingIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select("id, user_id, content, image_url, video_url, created_at, updated_at")
      .in("id", missingIds)
    extraPosts = (data as PostRow[] | null) ?? []
  }
  if (reposterIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, created_at")
      .in("id", reposterIds)
    for (const p of (data as Profile[] | null) ?? []) reposterProfiles.set(p.id, p)
  }

  const allRows = [...postRows, ...extraPosts]
  const enrichment = await enrichPosts(allRows, userId)
  const rowById = new Map(allRows.map((r) => [r.id, r]))

  type Item = { feed: FeedPost; sortTime: number }
  const items: Item[] = []
  const seen = new Set<string>()

  for (const row of postRows) {
    const e = enrichment.get(row.id)
    if (!e) continue
    items.push({ feed: toFeedPost(row, e), sortTime: new Date(row.created_at).getTime() })
    seen.add(row.id)
  }

  for (const r of repostRows) {
    const row = rowById.get(r.post_id)
    const e = row && enrichment.get(row.id)
    if (!row || !e) continue
    const reposter = reposterProfiles.get(r.user_id)
    items.push({
      feed: toFeedPost(row, e, reposter ? { id: reposter.id, display_name: reposter.display_name, username: reposter.username } : null),
      sortTime: new Date(r.created_at).getTime(),
    })
  }

  items.sort((a, b) => b.sortTime - a.sortTime)

  const deduped: FeedPost[] = []
  const usedIds = new Set<string>()
  for (const it of items) {
    const key = it.feed.reposted_by ? `rp-${it.feed.id}-${it.feed.reposted_by.id}` : it.feed.id
    if (usedIds.has(key)) continue
    if (usedIds.has(it.feed.id)) continue
    usedIds.add(key)
    usedIds.add(it.feed.id)
    deduped.push(it.feed)
  }

  return deduped.slice(0, 60)
}

export async function getRecentPosts(currentUserId: string | null, limit = 40): Promise<FeedPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, user_id, content, image_url, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  const rows = (data as PostRow[] | null) ?? []
  const enrichment = await enrichPosts(rows, currentUserId)
  return rows.map((r) => toFeedPost(r, enrichment.get(r.id)!)).filter(Boolean)
}

export async function getPostsByUser(userId: string, currentUserId: string | null): Promise<FeedPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, user_id, content, image_url, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60)
  const rows = (data as PostRow[] | null) ?? []
  const enrichment = await enrichPosts(rows, currentUserId)
  return rows.map((r) => toFeedPost(r, enrichment.get(r.id)!)).filter(Boolean)
}

export async function getSinglePost(postId: string, currentUserId: string | null): Promise<FeedPost | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, user_id, content, image_url, created_at, updated_at")
    .eq("id", postId)
    .maybeSingle()
  if (!data) return null
  const row = data as PostRow
  const enrichment = await enrichPosts([row], currentUserId)
  return toFeedPost(row, enrichment.get(row.id)!)
}

export async function getReplies(postId: string): Promise<Comment[]> {
  const supabase = await createClient()
  const { data: comments } = await supabase
    .from("comments")
    .select("id, user_id, post_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  const rows = comments ?? []
  if (rows.length === 0) return []

  const authorIds = Array.from(new Set(rows.map((c) => c.user_id)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .in("id", authorIds)
  const profileById = new Map<string, Profile>()
  for (const p of (profiles as Profile[] | null) ?? []) profileById.set(p.id, p)

  return rows.map((c) => ({
    ...c,
    author: profileById.get(c.user_id) ?? EMPTY_PROFILE(c.user_id),
  }))
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .ilike("username", username)
    .maybeSingle()
  return (data as Profile | null) ?? null
}

export async function getFollowStats(userId: string, currentUserId: string | null) {
  const supabase = await createClient()
  const [{ count: followers }, { count: following }, meFollowing] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    currentUserId
      ? supabase.from("follows").select("follower_id").eq("follower_id", currentUserId).eq("following_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return {
    followers: followers ?? 0,
    following: following ?? 0,
    isFollowing: Boolean((meFollowing as { data: unknown }).data),
  }
}

export async function getFollowingSet(currentUserId: string | null, candidateIds: string[]): Promise<Set<string>> {
  const set = new Set<string>()
  if (!currentUserId || candidateIds.length === 0) return set
  const supabase = await createClient()
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId)
    .in("following_id", candidateIds)
  for (const row of data ?? []) set.add(row.following_id)
  return set
}

export async function getConnectionProfiles(userId: string, kind: "followers" | "following"): Promise<Profile[]> {
  const supabase = await createClient()
  const column = kind === "followers" ? "following_id" : "follower_id"
  const otherColumn = kind === "followers" ? "follower_id" : "following_id"
  const { data: rels } = await supabase.from("follows").select(otherColumn).eq(column, userId)
  const ids = (rels ?? []).map((r) => (r as Record<string, string>)[otherColumn])
  if (ids.length === 0) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .in("id", ids)
  return (data as Profile[] | null) ?? []
}

/** People discovery: recent profiles, excluding the signed-in user and people already followed. */
export async function getSuggestedProfiles(currentUserId: string | null, limit = 8): Promise<Profile[]> {
  const supabase = await createClient()
  const followedIds = new Set<string>()
  if (currentUserId) {
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId)
    for (const row of follows ?? []) followedIds.add(row.following_id)
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 4, 24))

  return ((data as Profile[] | null) ?? [])
    .filter((profile) => profile.id !== currentUserId && !followedIds.has(profile.id))
    .slice(0, limit)
}

export async function searchProfiles(term: string): Promise<Profile[]> {
  if (!term.trim()) return []
  const supabase = await createClient()
  const like = `%${term.trim()}%`
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(20)
  return (data as Profile[] | null) ?? []
}

export async function searchPosts(term: string, currentUserId: string | null): Promise<FeedPost[]> {
  if (!term.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, user_id, content, image_url, created_at, updated_at")
    .ilike("content", `%${term.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(30)
  const rows = (data as PostRow[] | null) ?? []
  const enrichment = await enrichPosts(rows, currentUserId)
  return rows.map((r) => toFeedPost(r, enrichment.get(r.id)!)).filter(Boolean)
}

export async function getTrendingHashtags(limit = 6): Promise<{ tag: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(300)
  const counts = new Map<string, number>()
  const re = /#[\p{L}0-9_]+/gu
  for (const row of data ?? []) {
    const matches = (row.content as string).match(re)
    if (!matches) continue
    for (const m of matches) {
      const tag = m.toLowerCase()
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function getNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, actor_id, type, post_id, created_at, is_read")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
  const rows = data ?? []
  if (rows.length === 0) return []

  const actorIds = Array.from(new Set(rows.map((n) => n.actor_id).filter(Boolean)))
  const postIds = Array.from(new Set(rows.map((n) => n.post_id).filter(Boolean))) as string[]

  const [{ data: actors }, { data: posts }] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, username, display_name, bio, avatar_url, created_at").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("posts").select("id, content").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ])

  const actorById = new Map<string, Profile>()
  for (const a of (actors as Profile[] | null) ?? []) actorById.set(a.id, a)
  const postById = new Map<string, { id: string; content: string }>()
  for (const p of (posts as { id: string; content: string }[] | null) ?? []) postById.set(p.id, p)

  return rows.map((n) => ({
    ...n,
    actor: actorById.get(n.actor_id) ?? null,
    post: n.post_id ? postById.get(n.post_id) ?? null : null,
  })) as NotificationRow[]
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  return count ?? 0
}
