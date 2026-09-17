import { ExternalLink, Radio } from "lucide-react"

export function LivePlayer({ videoId, title }: { videoId?: string; title: string }) {
  const cleanVideoId = videoId?.trim()

  if (!cleanVideoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-secondary/40 p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <Radio className="size-6" />
          </div>
          <p className="mt-4 text-sm font-bold">Live stream ready to connect</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Add the YouTube live video ID to the deployment environment and this player will become the live broadcast window.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-sm">
      <div className="aspect-video">
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(cleanVideoId)}?rel=0&modestbranding=1`}
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
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(cleanVideoId)}`}
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
