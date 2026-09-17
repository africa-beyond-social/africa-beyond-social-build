"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { NotificationType } from "@/lib/types"

const MAX_LEN = 280
const MAX_MEDIA_SIZE = 25 * 1024 * 1024

type ActionResult = { ok: true } | { ok: false; error: string }

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function notify(params: { userId: string; actorId: string; type: NotificationType; postId?: string | null }) {
  if (params.userId === params.actorId) return
  try {
    const supabase = await createClient()
    await supabase.from("notifications").insert({ user_id: params.userId, actor_id: params.actorId, type: params.type, post_id: params.postId ?? null, is_read: false })
  } catch {}
}

export async function ensureProfile(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (existing) return
  const meta = (user.user_metadata ?? {}) as { display_name?: string; username?: string }
  const emailLocal = (user.email ?? "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user"
  const displayName = meta.display_name?.trim() || emailLocal
  const base = (meta.username?.trim() || emailLocal).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 20) || "user"
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = attempt === 0 ? "" : Math.random().toString(36).slice(2, 6)
    const username = `${base}${suffix}`.slice(0, 24)
    const { error } = await supabase.from("profiles").insert({ id: user.id, username, display_name: displayName, bio: null, avatar_url: null })
    if (!error) return
    if (error.code !== "23505") return
  }
}

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const displayName = String(formData.get("display_name") ?? "").trim()
  const username = String(formData.get("username") ?? "").trim()
  if (!email || !password) return { ok: false, error: "Email and password are required." }
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." }
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`, data: { display_name: displayName || undefined, username: username || undefined } } })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function createPost(content: string, media?: { url: string; type: string; name: string; size: number } | null): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed && !media?.url) return { ok: false, error: "Post cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Posts are limited to ${MAX_LEN} characters.` }
  if (media && (!media.url || !media.type || !media.name || media.size < 0 || media.size > MAX_MEDIA_SIZE)) return { ok: false, error: "Invalid media attachment." }
  const allowed = media?.type.startsWith("image/") || media?.type.startsWith("video/") || media?.type === "application/pdf"
  if (media && !allowed) return { ok: false, error: "Only photos, videos and PDF files can be attached." }
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("posts").insert({ user_id: userId, content: trimmed, image_url: media?.type.startsWith("image/") ? media.url : null, media_url: media?.url ?? null, media_type: media?.type ?? null, media_name: media?.name ?? null, media_size: media?.size ?? null })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  revalidatePath("/explore")
  revalidatePath("/media")
  return { ok: true }
}

export async function createDirectConversation(otherUserId: string): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  if (!otherUserId || otherUserId === userId) return { ok: false, error: "Choose another user." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { other_user_id: otherUserId })
  if (error || !data) return { ok: false, error: error?.message ?? "Could not start conversation." }
  revalidatePath("/messages")
  return { ok: true, conversationId: String(data) }
}

export async function sendMessage(conversationId: string, content: string): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: "Message cannot be empty." }
  if (trimmed.length > 4000) return { ok: false, error: "Messages are limited to 4,000 characters." }
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, content: trimmed })
  if (error) return { ok: false, error: error.message }
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
  revalidatePath(`/messages/${conversationId}`)
  revalidatePath("/messages")
  return { ok: true }
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/messages")
  return { ok: true }
}

export async function editPost(postId: string, content: string): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: "Post cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Posts are limited to ${MAX_LEN} characters.` }
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("posts").update({ content: trimmed, updated_at: new Date().toISOString() }).eq("id", postId).eq("user_id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  revalidatePath(`/post/${postId}`)
  return { ok: true }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/")
  revalidatePath("/explore")
  return { ok: true }
}

export async function toggleLike(postId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { data: existing } = await supabase.from("likes").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId })
    if (error) return { ok: false, error: error.message }
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).maybeSingle()
    if (post) await notify({ userId: post.user_id, actorId: userId, type: "like", postId })
  }
  revalidatePath("/")
  revalidatePath(`/post/${postId}`)
  return { ok: true }
}

export async function toggleRepost(postId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { data: existing } = await supabase.from("reposts").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
  if (existing) {
    const { error } = await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("reposts").insert({ post_id: postId, user_id: userId })
    if (error) return { ok: false, error: error.message }
    const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).maybeSingle()
    if (post) await notify({ userId: post.user_id, actorId: userId, type: "repost", postId })
  }
  revalidatePath("/")
  revalidatePath(`/post/${postId}`)
  return { ok: true }
}

export async function createReply(postId: string, content: string): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: "Reply cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Replies are limited to ${MAX_LEN} characters.` }
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: userId, content: trimmed })
  if (error) return { ok: false, error: error.message }
  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).maybeSingle()
  if (post) await notify({ userId: post.user_id, actorId: userId, type: "reply", postId })
  revalidatePath(`/post/${postId}`)
  revalidatePath("/")
  return { ok: true }
}

export async function toggleFollow(targetUserId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  if (userId === targetUserId) return { ok: false, error: "You cannot follow yourself." }
  const supabase = await createClient()
  const { data: existing } = await supabase.from("follows").select("follower_id").eq("follower_id", userId).eq("following_id", targetUserId).maybeSingle()
  if (existing) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetUserId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: targetUserId })
    if (error) return { ok: false, error: error.message }
    await notify({ userId: targetUserId, actorId: userId, type: "follow" })
  }
  revalidatePath("/")
  return { ok: true }
}

export async function updateProfile(input: { display_name: string; username: string; bio: string; avatar_url: string }): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const username = input.username.trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters (letters, numbers, underscore)." }
  if (input.display_name.trim().length < 1) return { ok: false, error: "Display name is required." }
  if (input.bio.length > 160) return { ok: false, error: "Bio must be 160 characters or fewer." }
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ display_name: input.display_name.trim(), username, bio: input.bio.trim() || null, avatar_url: input.avatar_url.trim() || null }).eq("id", userId)
  if (error) { if (error.code === "23505") return { ok: false, error: "That username is already taken." }; return { ok: false, error: error.message } }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/notifications")
  return { ok: true }
}
