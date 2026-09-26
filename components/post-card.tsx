"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Heart, MessageCircle, Repeat2, Share, Quote, MoreHorizontal, Pencil, Trash2, Bookmark, Paperclip, X } from "lucide-react"
import { toggleLike, toggleAmplify, toggleSave, createPost, deletePost } from "@/lib/actions"
import { UserAvatar } from "@/components/user-avatar"
import { PostContent } from "@/components/post-content"
import { EditPostDialog } from "@/components/edit-post-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { VerificationBadge } from "@/components/verification-badge"
import { createClient } from "@/lib/supabase/client"
import type { FeedPost } from "@/lib/types"

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`
  return n > 0 ? String(n) : ""
}

export function PostCard({
  post,
  currentUserId,
  emphasize = false,
}: {
  post: FeedPost
  currentUserId: string | null
  emphasize?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [amplified, setAmplifyed] = useState(post.amplified_by_me)
  const [amplifyCount, setAmplifyCount] = useState(post.amplify_count)
  const [saved, setSaved] = useState(post.saved_by_me)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [quoteFile, setQuoteFile] = useState<File | null>(null)
  const quoteFileRef = useRef<HTMLInputElement>(null)

  const isOwner = currentUserId === post.author.id
  const postHref = `/post/${post.id}`

  function requireAuth(): boolean {
    if (!currentUserId) {
      router.push("/auth/login")
      return false
    }
    return true
  }

  function onLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!requireAuth()) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    startTransition(async () => {
      const res = await toggleLike(post.id)
      if (!res.ok) {
        setLiked(!next)
        setLikeCount((c) => c + (next ? -1 : 1))
        toast.error(res.error)
      }
    })
  }

  function onAmplify(e: React.MouseEvent) {
    e.stopPropagation()
    if (!requireAuth()) return
    const next = !amplified
    setAmplifyed(next)
    setAmplifyCount((c) => c + (next ? 1 : -1))
    startTransition(async () => {
      const res = await toggleAmplify(post.id)
      if (!res.ok) {
        setAmplifyed(!next)
        setAmplifyCount((c) => c + (next ? -1 : 1))
        toast.error(res.error)
      } else if (next) {
        toast.success("Amplified.")
      }
    })
  }


  async function onSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (!requireAuth()) return
    const next = !saved
    setSaved(next)
    const res = await toggleSave(post.id)
    if (!res.ok) {
      setSaved(!next)
      toast.error(res.error)
    } else {
      toast.success(next ? "Added to Memory." : "Removed from Memory.")
    }
  }

  async function onQuote(e: React.MouseEvent) {
    e.stopPropagation()
    if (!requireAuth()) return
    const quotedText = post.content.trim()
    const comment = window.prompt("Add your comment to this quote (optional):", "")
    if (comment === null) return
    const prefix = comment.trim()
    const quote = `@${post.author.username}: "${quotedText}"`
    const content = prefix ? `${prefix.slice(0, 160)}\n\n${quote}` : quote
    const file = quoteFile
    let imageUrl: string | null = null
    let videoUrl: string | null = null
    let attachment: { url: string; type: string; name?: string } | undefined
    if (file) {
      if (file.size > 50 * 1024 * 1024) { toast.error("Files must be 50 MB or smaller."); return }
      const supabase = createClient()
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
      const path = (currentUserId ?? "user") + "/" + crypto.randomUUID() + "." + ext
      const uploaded = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })
      if (uploaded.error) { toast.error(uploaded.error.message); return }
      const url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl
      attachment = { url, type: file.type || "application/octet-stream", name: file.name }
      if (file.type.startsWith("video/")) videoUrl = url
      else if (file.type.startsWith("image/")) imageUrl = url
    }
    const res = await createPost(content, imageUrl, videoUrl, attachment)
    if (!res.ok) { toast.error(res.error); return }
    setQuoteFile(null)
    if (quoteFileRef.current) quoteFileRef.current.value = ""
    toast.success("Quoted to your profile.")
    router.refresh()
  }

  async function onShare(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}${postHref}`
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "WIGOD" })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard.")
      }
    } catch {
      // user dismissed share sheet; ignore
    }
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deletePost(post.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Post deleted.")
      setConfirmDelete(false)
      router.refresh()
    })
  }

  function goToPost() {
    router.push(postHref)
  }

  return (
    <article
      onClick={goToPost}
      className={cn(
        "flex cursor-pointer gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-secondary/40",
        emphasize && "cursor-default hover:bg-transparent",
      )}
    >
      <div className="flex flex-col items-center">
        <Link href={`/profile/${post.author.username}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
          <UserAvatar
            displayName={post.author.display_name}
            username={post.author.username}
            avatarUrl={post.author.avatar_url}
            className="size-10"
          />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        {post.amplified_by && (
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Repeat2 className="size-3.5" />
            <span>
              {post.amplified_by.display_name ?? `@${post.amplified_by.username}`} amplified
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href={`/profile/${post.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate font-semibold text-foreground hover:underline"
          >
            {post.author.display_name ?? post.author.username}
          </Link>
          <VerificationBadge type={post.author.verification_type} size="xs" />
          <span className="truncate text-muted-foreground">@{post.author.username}</span>
          <span className="text-muted-foreground">·</span>
          <time className="shrink-0 text-muted-foreground" dateTime={post.created_at}>
            {relativeTime(post.created_at)}
          </time>
          {post.updated_at && post.updated_at !== post.created_at && (
            <span className="shrink-0 text-xs text-muted-foreground">(edited)</span>
          )}

          {isOwner && (
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      aria-label="Post options"
                      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="mt-0.5">
          <PostContent content={post.content} />
        </div>

        {post.video_url && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-black">
            <video
              src={post.video_url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[560px] w-full"
            />
          </div>
        )}

        {post.image_url && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-secondary/30">
            <img
              src={post.image_url}
              alt="Post media"
              className="max-h-[520px] w-full object-contain"
              loading="lazy"
            />
          </div>
        )}

        {post.attachment_url && post.attachment_url !== post.image_url && post.attachment_url !== post.video_url && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-secondary/20">
            {post.attachment_type?.startsWith("audio/") ? (
              <audio src={post.attachment_url} controls className="w-full p-3" />
            ) : (
              <a href={post.attachment_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 p-4 text-sm hover:bg-secondary">
                <Paperclip className="size-5 shrink-0 text-brand-green" />
                <span className="min-w-0 truncate font-medium">{post.attachment_name ?? "Open attachment"}</span>
              </a>
            )}
          </div>
        )}

        <div className="mt-2 flex max-w-md items-center justify-between text-muted-foreground">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(postHref)
            }}
            className="group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green"
            aria-label="Reply"
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
              <MessageCircle className="size-[1.15rem]" />
            </span>
            <span className="tabular-nums">{formatCount(post.reply_count)}</span>
          </button>

          <button
            onClick={onAmplify}
            disabled={isPending}
            className={cn(
              "group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green",
              amplified && "text-brand-green",
            )}
            aria-label={amplified ? "Undo amplify" : "Amplify"}
            aria-pressed={amplified}
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
              <Repeat2 className="size-[1.15rem]" />
            </span>
            <span className="tabular-nums">{formatCount(amplifyCount)}</span>
          </button>

          <button
            onClick={onLike}
            disabled={isPending}
            className={cn(
              "group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-red",
              liked && "text-brand-red",
            )}
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-brand-red/10">
              <Heart className={cn("size-[1.15rem]", liked && "fill-current")} />
            </span>
            <span className="tabular-nums">{formatCount(likeCount)}</span>
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <input
              ref={quoteFileRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              className="hidden"
              onChange={(e) => setQuoteFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => quoteFileRef.current?.click()}
              className={cn("group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green", quoteFile && "text-brand-green")}
              aria-label={quoteFile ? "Quote file attached" : "Add files to quote"}
            >
              <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
                <Paperclip className="size-[1.05rem]" />
              </span>
            </button>
            {quoteFile && (
              <button
                type="button"
                onClick={() => { setQuoteFile(null); if (quoteFileRef.current) quoteFileRef.current.value = "" }}
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground shadow"
                aria-label="Remove quote attachment"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <button
            onClick={onQuote}
            className="group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green"
            aria-label="Quote"
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
              <Quote className="size-[1.15rem]" />
            </span>
          </button>

          <button
            onClick={onSave}
            className={cn("group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green", saved && "text-brand-green")}
            aria-label={saved ? "In Memory" : "Memory"}
            aria-pressed={saved}
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
              <Bookmark className={cn("size-[1.15rem]", saved && "fill-current")} />
            </span>
          </button>

          <button
            onClick={onShare}
            className="group flex items-center gap-1.5 text-sm transition-colors hover:text-brand-green"
            aria-label="Share"
          >
            <span className="flex size-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
              <Share className="size-[1.15rem]" />
            </span>
          </button>
        </div>
      </div>

      <EditPostDialog postId={post.id} initialContent={post.content} open={editing} onOpenChange={setEditing} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Delete post?</DialogTitle>
            <DialogDescription>This can&apos;t be undone. It will be removed from your profile and feeds.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
