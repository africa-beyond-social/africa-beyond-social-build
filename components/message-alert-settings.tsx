"use client"

import { useState } from "react"
import { Bell, Volume2 } from "lucide-react"

export function MessageAlertSettings() {
  const [enabled, setEnabled] = useState(typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted")

  async function enable() {
    if (!("Notification" in window)) return
    const permission = await Notification.requestPermission()
    setEnabled(permission === "granted")
    if (permission === "granted") {
      try {
        const ctx = new AudioContext()
        await ctx.resume()
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        gain.gain.value = 0.0001
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.03)
        oscillator.onended = () => void ctx.close()
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={enable}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
      title="Enable message sounds and browser notifications"
    >
      {enabled ? <Volume2 className="size-3.5" /> : <Bell className="size-3.5" />}
      {enabled ? "Alerts on" : "Enable alerts"}
    </button>
  )
}
