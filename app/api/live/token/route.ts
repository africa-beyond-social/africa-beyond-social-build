import { createHmac, randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/queries"

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

function signToken(apiKey: string, apiSecret: string, identity: string, room: string, canPublish: boolean) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = base64url(JSON.stringify({
    iss: apiKey,
    sub: identity,
    nbf: now - 5,
    exp: now + 3600,
    video: {
      room,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: false,
    },
  }))
  const unsigned = header + "." + payload
  const signature = createHmac("sha256", apiSecret)
    .update(unsigned)
    .digest("base64url")
  return unsigned + "." + signature
}

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

    if (role === "publisher") {
      const user = await getSessionUser()
      if (!isAdmin(user?.email)) {
        return NextResponse.json({ error: "Not authorised to publish WIGOD Live." }, { status: 403 })
      }
      const token = signToken(apiKey, apiSecret, user!.id, room, true)
      return NextResponse.json({ serverUrl: url, token, room, role })
    }

    const token = signToken(apiKey, apiSecret, randomUUID(), room, false)
    return NextResponse.json({ serverUrl: url, token, room, role })
  } catch (error) {
    console.error("WIGOD Live token error:", error)
    return NextResponse.json({ error: "WIGOD Live token service failed." }, { status: 500 })
  }
}
