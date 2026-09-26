"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { NotificationType } from "@/lib/types"

const MAX_LEN = 280

type ActionResult = { ok: true } | { ok: false; error: string }

async function getUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Best-effort notification insert. Never throws (RLS/self-notify are ignored). */
async function notify(params: { userId: string; actorId: string; type: NotificationType; postId?: string | null }) {
  if (params.userId === params.actorId) return
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      post_id: params.postId ?? null,
      is_read: false,
    })
    if (error) console.error("Notification insert failed", { type: params.type, postId: params.postId ?? null, error })
  } catch (error) {
    console.error("Notification insert threw", { type: params.type, postId: params.postId ?? null, error })
  }
}

/** Ensure the authenticated user has a profiles row; create a default one if not. */
export async function ensureProfile(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (existing) return

  const meta = (user.user_metadata ?? {}) as { display_name?: string; username?: string }
  const emailLocal = (user.email ?? "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user"
  const displayName = meta.display_name?.trim() || emailLocal
  const base = (meta.username?.trim() || emailLocal).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 20) || "user"

  // Try a few username variants to avoid unique collisions.
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = attempt === 0 ? "" : Math.random().toString(36).slice(2, 6)
    const username = `${base}${suffix}`.slice(0, 24)
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      display_name: displayName,
      bio: null,
      avatar_url: null,
    })
    if (!error) return
    // 23505 = unique_violation; retry with a suffix. Otherwise stop.
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      data: { display_name: displayName || undefined, username: username || undefined },
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function createPost(content: string, imageUrl?: string | null, videoUrl?: string | null): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed && !imageUrl && !videoUrl) return { ok: false, error: "Post cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Posts are limited to ${MAX_LEN} characters.` }

  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }

  const supabase = await createClient()
  const { error } = await supabase.from("posts").insert({ user_id: userId, content: trimmed, image_url: imageUrl ?? null, video_url: videoUrl ?? null })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/")
  revalidatePath("/explore")
  revalidatePath("/media")
  return { ok: true }
}

export async function editPost(postId: string, content: string): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: "Post cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Posts are limited to ${MAX_LEN} characters.` }

  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }

  const supabase = await createClient()
  // RLS restricts updates to the owner; also scope explicitly for safety.
  const { error } = await supabase
    .from("posts")
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId)
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
  const { data: existing } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()

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
  revalidatePath("/notifications")
  return { ok: true }
}

export async function toggleAmplify(postId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("reposts")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()

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
  revalidatePath("/notifications")
  return { ok: true }
}

export async function createReply(
  postId: string,
  content: string,
  attachment?: { url: string; type: string; name?: string },
): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed && !attachment) return { ok: false, error: "Reply cannot be empty." }
  if (trimmed.length > MAX_LEN) return { ok: false, error: `Replies are limited to ${MAX_LEN} characters.` }

  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }

  const supabase = await createClient()
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: userId,
    content: trimmed,
    attachment_url: attachment?.url ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_name: attachment?.name ?? null,
  })
  if (error) return { ok: false, error: error.message }

  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).maybeSingle()
  if (post) await notify({ userId: post.user_id, actorId: userId, type: "reply", postId })

  revalidatePath(`/post/${postId}`)
  revalidatePath("/")
  return { ok: true }
}

export async function toggleSave(postId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  const supabase = await createClient()
  const { data: existing } = await supabase.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
  if (existing) {
    const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: userId })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath("/")
  revalidatePath("/memory")
  return { ok: true }
}

export async function toggleFollow(targetUserId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }
  if (userId === targetUserId) return { ok: false, error: "You cannot follow yourself." }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetUserId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: targetUserId })
    if (error) return { ok: false, error: error.message }
    await notify({ userId: targetUserId, actorId: userId, type: "follow" })
  }

  revalidatePath("/")
  revalidatePath("/notifications")
  return { ok: true }
}

export async function updateProfile(input: {
  display_name: string
  username: string
  bio: string
  avatar_url: string
}): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "You must be signed in." }

  const username = input.username.trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters (letters, numbers, underscore)." }
  if (input.display_name.trim().length < 1) return { ok: false, error: "Display name is required." }
  if (input.bio.length > 160) return { ok: false, error: "Bio must be 160 characters or fewer." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name.trim(),
      username,
      bio: input.bio.trim() || null,
      avatar_url: input.avatar_url.trim() || null,
    })
    .eq("id", userId)

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is already taken." }
    return { ok: false, error: error.message }
  }

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


export async function sendMessage(recipientId:string, content:string):Promise<ActionResult>{const trimmed=content.trim();if(!trimmed)return{ok:false,error:"Message cannot be empty."};if(trimmed.length>2000)return{ok:false,error:"Message is limited to 2000 characters."};const userId=await getUserId();if(!userId)return{ok:false,error:"You must be signed in."};if(userId===recipientId)return{ok:false,error:"You cannot message yourself."};const supabase=await createClient();const{error}=await supabase.from("messages").insert({sender_id:userId,recipient_id:recipientId,content:trimmed});if(error)return{ok:false,error:error.message};await supabase.from("notifications").insert({user_id:recipientId,actor_id:userId,type:"message"});revalidatePath("/messages");revalidatePath("/notifications");return{ok:true}}

export async function markConversationDelivered(otherUserId:string):Promise<ActionResult>{const userId=await getUserId();if(!userId)return{ok:false,error:"You must be signed in."};const supabase=await createClient();const{error}=await supabase.from("messages").update({delivered_at:new Date().toISOString()}).eq("sender_id",otherUserId).eq("recipient_id",userId).is("delivered_at",null);if(error)return{ok:false,error:error.message};revalidatePath("/messages");return{ok:true}}

export async function markConversationRead(otherUserId:string):Promise<ActionResult>{const userId=await getUserId();if(!userId)return{ok:false,error:"You must be signed in."};const supabase=await createClient();const{error}=await supabase.from("messages").update({read_at:new Date().toISOString()}).eq("sender_id",otherUserId).eq("recipient_id",userId).is("read_at",null);if(error)return{ok:false,error:error.message};revalidatePath("/messages");return{ok:true}}

export async function dismissNotification(notificationId:string):Promise<ActionResult>{const userId=await getUserId();if(!userId)return{ok:false,error:"You must be signed in."};const supabase=await createClient();const{error}=await supabase.from("notifications").delete().eq("id",notificationId).eq("user_id",userId);if(error)return{ok:false,error:error.message};revalidatePath("/notifications");revalidatePath("/","layout");return{ok:true}}
