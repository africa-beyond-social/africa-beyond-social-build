import Link from "next/link"
import { redirect } from "next/navigation"
import { Heart, MessageCircle, Repeat2, UserPlus, Bell } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/feed-list"
import { UserAvatar } from "@/components/user-avatar"
import { MarkNotificationsRead } from "@/components/mark-notifications-read"
import { getNotifications, getSessionUser } from "@/lib/queries"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { NotificationRow } from "@/lib/types"

const CONFIG = {
  follow: { icon: UserPlus, color: "text-brand-green", verb: "followed you" },
  like: { icon: Heart, color: "text-brand-red", verb: "liked your post" },
  reply: { icon: MessageCircle, color: "text-brand-green", verb: "replied to your post" },
  repost: { icon: Repeat2, color: "text-brand-green", verb: "reposted your post" },
} as const

function NotificationItem({ n }: { n: NotificationRow }) {
  const cfg = CONFIG[n.type] ?? CONFIG.like
  const Icon = cfg.icon
  const actorName = n.actor?.display_name ?? n.actor?.username ?? "Someone"
  const href = n.post_id ? `/post/${n.post_id}` : n.actor ? `/profile/${n.actor.username}` : "/notifications"

  return (
    <Link
      href={href}
      className={cn(
        "flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-secondary/40",
        !n.is_read && "bg-accent/40",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", cfg.color)}>
        <Icon className={cn("size-5", n.type === "like" && "fill-current")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {n.actor && (
            <UserAvatar
              displayName={n.actor.display_name}
              username={n.actor.username}
              avatarUrl={n.actor.avatar_url}
              className="size-8"
            />
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(n.created_at)}</span>
        </div>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{actorName}</span>{" "}
          <span className="text-foreground/80">{cfg.verb}</span>
        </p>
        {n.post?.content && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.post.content}</p>}
      </div>
    </Link>
  )
}

export default async function NotificationsPage() {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  const notifications = await getNotifications(user.id)
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Follows, likes, replies and reposts" />
      <MarkNotificationsRead hasUnread={hasUnread} />
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="No notifications yet"
          description="When people interact with you or your posts, you'll see it here."
        />
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationItem key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  )
}
