"use client"

import { useEffect, useState } from "react"
import { LiveEventCard } from "@/components/live-event-card"

 type Broadcast = {
  videoId: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  scheduledStartAt: string | null
}

type LiveStatusResponse = {
  configured: boolean
  upcoming: Broadcast | null
}

export function YouTubeUpcomingEvent() {
  const [upcoming, setUpcoming] = useState<Broadcast | null>(null)

  useEffect(() => {
    let active = true

    const check = async () => {
      try {
        const response = await fetch("/api/live/status", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as LiveStatusResponse
        if (active) setUpcoming(data.configured ? data.upcoming : null)
      } catch {
        // Keep the existing result when the status endpoint is temporarily unavailable.
      }
    }

    check()
    const timer = window.setInterval(check, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  if (!upcoming?.scheduledStartAt) return null

  return (
    <LiveEventCard
      title={upcoming.title}
      start={upcoming.scheduledStartAt}
      location="Africa & Beyond TV • YouTube"
    />
  )
}
