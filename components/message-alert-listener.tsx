"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function MessageAlertListener({ userId }: { userId: string }) {
  const router = useRouter()
  const lastId = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const playSound = () => {
      try {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioCtx) return
        const ctx = new AudioCtx()
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.16)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.2)
        oscillator.onended = () => void ctx.close()
      } catch {}
    }

    const notify = async (content: string) => {
      playSound()
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New WIGOD message", {
          body: content || "You received a new private message.",
          tag: "wigod-message",
        })
      }
      router.refresh()
    }

    const checkLatest = async (initial = false) => {
      const { data } = await supabase
        .from("messages")
        .select("id,content,created_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active || !data) return
      if (lastId.current === null) {
        lastId.current = data.id
        if (initial) return
      } else if (lastId.current !== data.id) {
        lastId.current = data.id
        await notify(data.content)
      }
    }

    void checkLatest(true)
    const timer = window.setInterval(() => void checkLatest(false), 3000)

    const channel = supabase
      .channel("wigod-message-alerts-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "recipient_id=eq." + userId,
      }, (payload) => {
        const row = payload.new as { id?: string; content?: string }
        if (!row.id || row.id === lastId.current) return
        lastId.current = row.id
        void notify(row.content ?? "")
      })
      .subscribe()

    return () => {
      active = false
      window.clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [router, userId])

  return null
}
