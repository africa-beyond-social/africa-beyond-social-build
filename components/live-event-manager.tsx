"use client"

import { useState } from "react"
import { CalendarPlus, Trash2 } from "lucide-react"
import type { LiveEvent } from "@/lib/live"

export function LiveEventManager({ initialEvents }: { initialEvents: LiveEvent[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function createEvent(formData: FormData) {
    setSaving(true)
    setMessage("")
    const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>
    const startAt = String(payload.startAt || "")
    const endAt = String(payload.endAt || "")
    const normalized = {
      ...payload,
      startAt: startAt ? new Date(startAt).toISOString() : "",
      endAt: endAt ? new Date(endAt).toISOString() : "",
    }
    const response = await fetch("/api/live/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalized) })
    const result = await response.json()
    if (!response.ok) {
      setMessage(result.error || "Could not create event")
      setSaving(false)
      return
    }
    setEvents((current) => [...current, result.event].sort((a: LiveEvent, b: LiveEvent) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()))
    setMessage("Event saved")
    setSaving(false)
  }

  async function deleteEvent(id: string) {
    const response = await fetch(`/api/live/events?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (response.ok) setEvents((current) => current.filter((event) => event.id !== id))
  }

  return (
    <div className="space-y-6">
      <form action={createEvent} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-serif text-lg font-bold">Schedule another live event</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">YouTube broadcasts from Africa & Beyond TV are detected automatically. Use this form for StreamYard, conference, community or other live programmes that need to be listed separately.</p>
        </div>
        <input name="title" required placeholder="Event title" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
        <input name="location" placeholder="Location" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
        <input name="startAt" required type="datetime-local" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
        <input name="endAt" type="datetime-local" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
        <select name="category" defaultValue="community" className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="news">News</option><option value="community">Community</option><option value="conference">Conference</option><option value="culture">Culture</option><option value="sports">Sports</option><option value="other">Other</option></select>
        <select name="provider" defaultValue="streamyard" className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="streamyard">StreamYard</option><option value="other">Other</option></select>
        <input name="streamUrl" placeholder="Stream/watch URL (optional)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30" />
        <textarea name="description" placeholder="Description" className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/30 sm:col-span-2" />
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"><CalendarPlus className="size-4" /> {saving ? "Saving…" : "Save event"}</button>
        {message ? <p className="text-xs text-muted-foreground sm:col-span-2">{message}</p> : null}
      </form>

      <section>
        <div className="mb-3"><h2 className="font-serif text-lg font-bold">Scheduled other events</h2><p className="text-xs text-muted-foreground">These records power additional programme cards in the public Live Centre.</p></div>
        {events.length === 0 ? <p className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">No manually scheduled events.</p> : <div className="space-y-2">{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"><div><p className="text-sm font-bold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.start_at).toLocaleString()} {event.location ? `• ${event.location}` : ""}</p></div><button type="button" onClick={() => deleteEvent(event.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-brand-red" aria-label={`Delete ${event.title}`}><Trash2 className="size-4" /></button></div>)}</div>}
      </section>
    </div>
  )
}
