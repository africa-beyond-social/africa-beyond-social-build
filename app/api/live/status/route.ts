import { NextResponse } from "next/server"

const DEFAULT_CHANNEL_ID = "UC4c_VhltMjJ3lqkQREjnzfQ"
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/search"

type YouTubeItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    description?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } }
  }
}

type YouTubeSearchResponse = { items?: YouTubeItem[] }

async function findBroadcast(channelId: string, eventType: "live" | "upcoming") {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null

  const url = new URL(YOUTUBE_API_BASE)
  url.searchParams.set("part", "snippet")
  url.searchParams.set("channelId", channelId)
  url.searchParams.set("eventType", eventType)
  url.searchParams.set("type", "video")
  url.searchParams.set("maxResults", "1")
  url.searchParams.set("key", key)

  const response = await fetch(url, { next: { revalidate: 30 } })
  if (!response.ok) return null

  const payload = (await response.json()) as YouTubeSearchResponse
  const item = payload.items?.[0]
  const videoId = item?.id?.videoId
  if (!videoId) return null

  return {
    videoId,
    title: item.snippet?.title ?? "Africa & Beyond TV Live",
    description: item.snippet?.description ?? null,
    thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
  }
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || process.env.NEXT_PUBLIC_LIVE_YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID

  try {
    const [live, upcoming] = await Promise.all([
      findBroadcast(channelId, "live"),
      findBroadcast(channelId, "upcoming"),
    ])

    return NextResponse.json(
      {
        configured: Boolean(process.env.YOUTUBE_API_KEY),
        channelId,
        live,
        upcoming,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    )
  } catch {
    return NextResponse.json(
      { configured: Boolean(process.env.YOUTUBE_API_KEY), channelId, live: null, upcoming: null, checkedAt: new Date().toISOString() },
      { status: 200 },
    )
  }
}
