import { randomUUID } from "node:crypto"
import { AccessToken } from "livekit-server-sdk"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/queries"

function isAdmin(email?: string | null) {
  return Boolean(
    email &&
      (process.env.LIVE_ADMIN_EMAILS || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(email.toLowerCase()),
  )
}

export async function POST(request: Request) {
  try {
    const url = process.env.LIVEKIT_URL?.trim()
    const apiKey = process.env.LIVEKIT_API_KEY?.trim()
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "WIGOD Live transport is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel." },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const room = String(body.room || "").trim()
    const role = body.role === "publisher" ? "publisher" : "viewer"

    if (!room || room.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(room)) {
      return NextResponse.json({ error: "A valid WIGOD Live room is required." }, { status: 400 })
    }

    let identity: string
    let canPublish = false

    if (role === "publisher") {
      const user = await getSessionUser()
      if (!isAdmin(user?.email)) {
        return NextResponse.json({ error: "Not authorised to publish WIGOD Live." }, { status: 403 })
      }
      identity = user!.id
      canPublish = true
    } else {
      identity = "viewer-" + randomUUID()
    }

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: "1h",
    })

    accessToken.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true,
      canPublishData: false,
    })

    const token = await accessToken.toJwt()

    return NextResponse.json({
      serverUrl: url,
      token,
      room,
      role,
    })
  } catch (error) {
    console.error("WIGOD Live token error:", error)
    return NextResponse.json({ error: "WIGOD Live token service failed." }, { status: 500 })
  }
}
