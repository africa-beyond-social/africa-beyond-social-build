import { NextResponse } from "next/server"

const DEFAULT_CHANNEL_ID = "UC4c_VhltMjJ3lqkQREjnzfQ"
const YOUTUBE_SEARCH_BASE = "https://www.googleapis.com/youtube/v3/search"
const YOUTUBE_VIDEOS_BASE = "https://www.googleapis.com/youtube/v3/videos"

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

type YouTubeVideoDetails = {
  items?: Array<{
    liveStreamingDetails?: {
      scheduledStartTime?: string
      actualStartTime?: string
      actualEndTime?: string
    }
  }>
}

type BroadcastResult = {
  data: {
    videoId: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    publishedAt: string | null
    scheduledStartAt: string | null
  } | null
  error?: { status: number; reason?: string; message?: string }
}

async function getStreamingDetails(videoId: string, key: string) {
  const url = new URL(YOUTUBE_VIDEOS_BASE)
  url.searchParams.set("part", "liveStreamingDetails")
  url.searchParams.set("id", videoId)
  url.searchParams.set("key", key)

  const response = await fetch(url, { next: { revalidate: 30 } })
  if (!response.ok) return null

  const payload = (await response.json()) as YouTubeVideoDetails
  return payload.items?.[0]?.liveStreamingDetails ?? null
}

async function findBroadcast(channelId: string, eventType: "live" | "upcoming"): Promise<BroadcastResult> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return { data: null, error: { status: 0, reason: "missing_api_key" } }

  const url = new URL(YOUTUBE_SEARCH_BASE)
  url.searchParams.set("part", "snippet")
  url.searchParams.set("channelId", channelId)
  url.searchParams.set("eventType", eventType)
  url.searchParams.set("type", "video")
  url.searchParams.set("maxResults", "1")
  url.searchParams.set("key", key)

  const response = await fetch(url, { next: { revalidate: 30 } })
  if (!response.ok) {
    let reason: string | undefined
    let message: string | undefined
    try {
      const payload = (await response.json()) as { error?: { errors?: Array<{ reason?: string }>; message?: string } }
      reason = payload.error?.errors?.[0]?.reason
      message = payload.error?.message
    } catch {
      // Keep the response safe if YouTube does not return JSON.
    }
    return { data: null, error: { status: response.status, reason, message } }
  }

  const payload = (await response.json()) as YouTubeSearchResponse
  const item = payload.items?.[0]
  const videoId = item?.id?.videoId
  if (!videoId) return { data: null }

  const streamingDetails = await getStreamingDetails(videoId, key)

  return {
    data: {
      videoId,
      title: item.snippet?.title ?? "Africa & Beyond TV Live",
      description: item.snippet?.description ?? null,
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
      scheduledStartAt: streamingDetails?.scheduledStartTime ?? null,
    },
  }
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || process.env.NEXT_PUBLIC_LIVE_YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID

  try {
    const [liveResult, upcomingResult] = await Promise.all([
      findBroadcast(channelId, "live"),
      findBroadcast(channelId, "upcoming"),
    ])

    return NextResponse.json(
      {
        configured: Boolean(process.env.YOUTUBE_API_KEY),
        channelId,
        live: liveResult.data,
        upcoming: upcomingResult.data,
        diagnostics: {
          live: liveResult.error ?? null,
          upcoming: upcomingResult.error ?? null,
        },
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    )
  } catch {
    return NextResponse.json(
      { configured: Boolean(process.env.YOUTUBE_API_KEY), channelId, live: null, upcoming: null, diagnostics: { request: "unexpected_error" }, checkedAt: new Date().toISOString() },
      { status: 200 },
    )
  }
}
