"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Radio } from "lucide-react"
import { LivePlayer } from "@/components/live-player"

type Broadcast = {
  videoId: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
}

type LiveStatusResponse = {
  configured: boolean
  live: Broadcast | null
  upcoming: Broadcast | null
  checkedAt: string
}

export function LiveStatus({ fallbackVideoId, fallbackTitle, channelId }: { fallbackVideoId?: string; fallbackTitle: string; channelId?: string }) {
  const [status, setStatus] = useState<LiveStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const check = async () => {
      try {
        const response = await fetch("/api/live/status", { cache: "no-store" })
        if (!response.ok) throw new Error("Live status request failed")
        const next = (await response.json()) as LiveStatusResponse
        if (active) setStatus(next)
      } catch {
        if (active) setStatus(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    check()
    const timer = window.setInterval(check, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const live = status?.live ?? null
  const videoId = live?.videoId ?? fallbackVideoId
  const title = live?.title ?? fallbackTitle

  if (live || fallbackVideoId || loading) {
    return (
      <div>
        {live ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-red">
              <span className="size-1.5 rounded-full bg-brand-red" /> Live now
            </span>
            <span className="text-[10px] text-muted-foreground">Auto-updates every minute</span>
          </div>
        ) : null}
        <LivePlayer videoId={videoId} channelId={channelId} title={title} />
        {live ? (
          <p className="mt-2 text-xs text-muted-foreground">{live.description || "You are watching Africa & Beyond TV live."}</p>
        ) : loading ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Checking broadcast status…</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-6">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Radio className="size-6" /></div>
        <h3 className="mt-4 text-base font-bold">Africa & Beyond TV is not live right now</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">This page checks the YouTube channel automatically and will switch to the live broadcast when one is detected.</p>
        <a href="https://www.youtube.com/@africaandbeyondtv/live" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-background">Open Africa & Beyond TV <ExternalLink className="size-3.5" /></a>
      </div>
    </div>
  )
}
