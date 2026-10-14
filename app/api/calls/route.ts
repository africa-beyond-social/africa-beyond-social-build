import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_SIGNAL_BYTES = 64 * 1024
const SIGNAL_KINDS = ["offer", "answer", "ice", "hangup"] as const
const CALL_STATUSES = ["accepted", "rejected", "ended", "missed"] as const

type SignalKind = (typeof SIGNAL_KINDS)[number]
type CallStatus = (typeof CALL_STATUSES)[number]
type JsonObject = Record<string, unknown>

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function responseError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function isParticipant(session: { caller_id: string; recipient_id: string }, userId: string) {
  return session.caller_id === userId || session.recipient_id === userId
}

async function readBody(req: Request): Promise<JsonObject | null> {
  try {
    const value: unknown = await req.json()
    return isObject(value) ? value : null
  } catch {
    return null
  }
}

function validSignalPayload(kind: SignalKind, payload: unknown): payload is JsonObject {
  if (!isObject(payload)) return false

  let serialized: string
  try {
    serialized = JSON.stringify(payload)
  } catch {
    return false
  }
  if (serialized.length > MAX_SIGNAL_BYTES) return false

  if (kind === "offer" || kind === "answer") {
    return payload.type === kind && typeof payload.sdp === "string" && payload.sdp.length > 0
  }
  if (kind === "ice") {
    return typeof payload.candidate === "string" && payload.candidate.length > 0
  }
  return true
}

export async function POST(req: Request) {
  const { supabase, user } = await auth()
  if (!user) return responseError("You must be signed in.", 401)

  const body = await readBody(req)
  if (!body) return responseError("Invalid request body.", 400)
  const action = body.action

  if (action === "create") {
    const recipientId = typeof body.recipientId === "string" ? body.recipientId : ""
    if (!UUID_RE.test(recipientId) || recipientId === user.id) {
      return responseError("Invalid recipient.", 400)
    }

    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", recipientId)
      .maybeSingle()
    if (recipientError) return responseError("Could not verify the recipient.", 500)
    if (!recipient) return responseError("Recipient not found.", 404)

    const { data: blocked, error: blockError } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", recipientId)
      .maybeSingle()
    if (blockError) return responseError("Could not verify contact permissions.", 500)
    if (blocked) return responseError("You cannot call this user while they are blocked.", 403)

    // Preserve the existing single-outgoing-ring behaviour for the caller.
    await supabase
      .from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("caller_id", user.id)
      .eq("status", "ringing")

    const { data, error } = await supabase
      .from("call_sessions")
      .insert({ caller_id: user.id, recipient_id: recipientId, status: "ringing" })
      .select("id,caller_id,recipient_id,status,created_at")
      .single()

    if (error || !data) return responseError("Could not start the call.", 500)
    return NextResponse.json({ session: data })
  }

  if (action === "status") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    const status = body.status
    if (!UUID_RE.test(sessionId) || typeof status !== "string" || !CALL_STATUSES.includes(status as CallStatus)) {
      return responseError("Invalid call status.", 400)
    }

    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .select("id,caller_id,recipient_id,status")
      .eq("id", sessionId)
      .maybeSingle()
    if (sessionError) return responseError("Could not check call permissions.", 500)
    if (!session) return responseError("Call not found.", 404)
    if (!isParticipant(session, user.id)) return responseError("You are not a participant in this call.", 403)

    const requestedStatus = status as CallStatus
    const terminal = ["rejected", "ended", "missed"].includes(session.status)
    if (requestedStatus === "accepted" || requestedStatus === "rejected" || requestedStatus === "missed") {
      if (user.id !== session.recipient_id || session.status !== "ringing") {
        if (requestedStatus === "accepted" && user.id === session.recipient_id && session.status === "accepted") {
          return NextResponse.json({ session: { id: session.id, status: session.status } })
        }
        return responseError("That call status change is not allowed.", 409)
      }
    } else if (requestedStatus === "ended") {
      if (terminal) return NextResponse.json({ session: { id: session.id, status: session.status } })
      if (session.status !== "ringing" && session.status !== "accepted") {
        return responseError("That call status change is not allowed.", 409)
      }
    }

    const patch: Record<string, string> = { status: requestedStatus }
    if (requestedStatus === "accepted") patch.answered_at = new Date().toISOString()
    if (["ended", "rejected", "missed"].includes(requestedStatus)) patch.ended_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("call_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("status", session.status)
      .select("id,status")
      .maybeSingle()

    if (error) return responseError("Could not update the call.", 500)
    if (!data) return responseError("The call changed; refresh and try again.", 409)
    return NextResponse.json({ session: data })
  }

  if (action === "signal") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    const kind = body.kind
    const payload = body.payload ?? {}
    if (!UUID_RE.test(sessionId) || typeof kind !== "string" || !SIGNAL_KINDS.includes(kind as SignalKind)) {
      return responseError("Invalid call signal.", 400)
    }
    if (!validSignalPayload(kind as SignalKind, payload)) {
      return responseError("Invalid or oversized call signal.", 400)
    }

    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .select("id,caller_id,recipient_id,status")
      .eq("id", sessionId)
      .maybeSingle()
    if (sessionError) return responseError("Could not check call permissions.", 500)
    if (!session) return responseError("Call not found.", 404)
    if (!isParticipant(session, user.id)) return responseError("You are not a participant in this call.", 403)
    if (["rejected", "ended", "missed"].includes(session.status)) {
      return responseError("This call has already ended.", 409)
    }
    if (kind === "offer" && user.id !== session.caller_id) {
      return responseError("Only the caller can send an offer.", 403)
    }
    if (kind === "answer" && user.id !== session.recipient_id) {
      return responseError("Only the recipient can send an answer.", 403)
    }

    const { data, error } = await supabase
      .from("call_signals")
      .insert({ session_id: sessionId, sender_id: user.id, kind, payload })
      .select("id")
      .single()

    if (error || !data) return responseError("Could not send the call signal.", 500)
    return NextResponse.json({ ok: true, id: data.id })
  }

  return responseError("Unknown action.", 400)
}

export async function GET(req: Request) {
  const { supabase, user } = await auth()
  if (!user) return responseError("You must be signed in.", 401)

  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session")
  const incoming = url.searchParams.get("incoming")

  if (sessionId) {
    if (!UUID_RE.test(sessionId)) return responseError("Call not found.", 404)

    const { data: session, error: sessionError } = await supabase
      .from("call_sessions")
      .select("id,caller_id,recipient_id,status,created_at,answered_at,ended_at")
      .eq("id", sessionId)
      .maybeSingle()
    if (sessionError) return responseError("Could not load the call.", 500)
    if (!session) return responseError("Call not found.", 404)
    if (!isParticipant(session, user.id)) return responseError("Call not found.", 404)

    const { data: signals, error: signalsError } = await supabase
      .from("call_signals")
      .select("id,sender_id,kind,payload,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
    if (signalsError) return responseError("Could not load call signals.", 500)
    return NextResponse.json({ session, signals: signals ?? [] })
  }

  if (incoming) {
    const { data, error } = await supabase
      .from("call_sessions")
      .select("id,caller_id,recipient_id,status,created_at")
      .eq("recipient_id", user.id)
      .eq("status", "ringing")
      .order("created_at", { ascending: false })
      .limit(3)
    if (error) return responseError("Could not load incoming calls.", 500)
    return NextResponse.json({ calls: data ?? [] })
  }

  return NextResponse.json({ calls: [] })
}
