import { NextResponse } from "next/server"

const DEFAULT_CHANNEL_ID = "UC4c_VhltMjJ3lqkQREjnzfQ"
const BASE = "https://www.googleapis.com/youtube/v3/search"

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || process.env.NEXT_PUBLIC_LIVE_YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID
  if (!key) return NextResponse.json({ configured: false, channelId, live: null, upcoming: null, checkedAt: new Date().toISOString() })

  async function find(eventType: "live" | "upcoming") {
    const u = new URL(BASE)
    u.searchParams.set("part", "snippet")
    u.searchParams.set("channelId", channelId)
    u.searchParams.set("eventType", eventType)
    u.searchParams.set("type", "video")
    u.searchParams.set("maxResults", "1")
    u.searchParams.set("key", key)
    const r = await fetch(u, { next: { revalidate: 30 } })
    if (!r.ok) return null
    const p = await r.json()
    const item = p.items?.[0]
    const videoId = item?.id?.videoId
    if (!videoId) return null
    return { videoId, title: item.snippet?.title ?? "WIGOD Live", description: item.snippet?.description ?? null }
  }

  try {
    const [live, upcoming] = await Promise.all([find("live"), find("upcoming")])
    return NextResponse.json({ configured: true, channelId, live, upcoming, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } })
  } catch {
    return NextResponse.json({ configured: true, channelId, live: null, upcoming: null, checkedAt: new Date().toISOString() })
  }
}