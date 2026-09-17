import { ExternalLink, Radio } from "lucide-react"

const DEFAULT_CHANNEL_ID = "UC4c_VhltMjJ3lqkQREjnzfQ"

export function LivePlayer({ videoId, channelId, title }: { videoId?: string; channelId?: string; title: string }) {
  const cleanVideoId = videoId?.trim()
  const cleanChannelId = channelId?.trim() || DEFAULT_CHANNEL_ID
  const embedUrl = cleanVideoId
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(cleanVideoId)}?rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(cleanChannelId)}&rel=0&modestbranding=1`
  const watchUrl = cleanVideoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(cleanVideoId)}`
    : `https://www.youtube.com/@africaandbeyondtv/live`

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-sm">
      <div className="aspect-video">
        <iframe
          className="size-full"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-2 shrink-0 rounded-full bg-brand-red" />
          <span className="truncate text-xs font-semibold">{title}</span>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
        >
          YouTube <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  )
}
