"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2, Radio, Share2, Users } from "lucide-react"

type LiveSession = {
  title: string
  description: string | null
  room_name: string
  status: "live"
  live_started_at: string | null
}

export function WigodLiveNow() {
  const [live, setLive] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const response = await fetch("/api/live/session", { cache: "no-store" })
        const payload = await response.json()
        if (active) setLive(payload.live ?? null)
      } catch {
        if (active) setLive(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void check()
    const timer = window.setInterval(check, 15000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking WIGOD Live…
        </div>
      </div>
    )
  }

  if (!live) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-center">
        <Radio className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-bold">No native WIGOD broadcast is live</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          When a WIGOD Studio programme starts, it will appear here automatically.
        </p>
      </div>
    )
  }

  const publicUrl = "/live/" + encodeURIComponent(live.room_name)

  return (
    <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-white" />
          WIGOD Live
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <Users className="size-3.5" />
          Live programme
        </span>
      </div>
      <h3 className="font-serif text-xl font-bold">{live.title}</h3>
      {live.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{live.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={publicUrl} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-red px-4 py-2.5 text-xs font-bold text-white">
          <Radio className="size-3.5" />
          Watch Live
        </Link>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(window.location.origin + publicUrl)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-bold"
        >
          <Share2 className="size-3.5" />
          Share
        </button>
      </div>
    </div>
  )
}
