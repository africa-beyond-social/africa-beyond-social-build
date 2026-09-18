export type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  image_url: string | null
  video_url: string | null
  created_at: string
  updated_at: string | null
}

// A post enriched with author + interaction data for rendering in feeds.
export type FeedPost = {
  id: string
  content: string
  image_url: string | null
  video_url: string | null
  created_at: string
  updated_at: string | null
  author: Profile
  like_count: number
  reply_count: number
  repost_count: number
  liked_by_me: boolean
  reposted_by_me: boolean
  // Present when this row appears in the feed because someone reposted it.
  reposted_by?: { id: string; display_name: string | null; username: string } | null
}

export type NotificationType = "follow" | "like" | "reply" | "repost"

export type NotificationRow = {
  id: string
  user_id: string
  actor_id: string
  type: NotificationType
  post_id: string | null
  created_at: string
  is_read: boolean
  actor: Profile | null
  post: { id: string; content: string } | null
}

export type Comment = {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  author: Profile
}
