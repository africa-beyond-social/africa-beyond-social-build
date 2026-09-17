"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock3, MapPin, Radio } from "lucide-react"

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

export function LiveEventCard({
  title,
  start,
  location,
}: {
  title: string
  start?: string
  location?: string
}) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!start) return
    const target = new Date(start).getTime()
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [start])

  if (!start) {
    return (
      <div className="rounded-2xl border border-border p-4">
        <CalendarDays className="size-5 text-brand-green" />
        <h3 className="mt-3 text-sm font-bold">Upcoming events</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Scheduled programmes, conferences and community events will appear here when an event is configured.
        </p>
      </div>
    )
  }

  const date = new Date(start)
  const hasStarted = remaining === 0
  const parts = remaining === null ? null : formatRemaining(remaining)

  return (
    <div className="rounded-2xl border border-border bg-brand-green/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
          <CalendarDays className="size-5" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-green">
          <Radio className="size-3" /> {hasStarted ? "Starting" : "Upcoming"}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-bold">{title}</h3>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
        {location ? <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {location}</p> : null}
      </div>
      {parts ? (
        <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
          {[['Days', parts.days], ['Hours', parts.hours], ['Min', parts.minutes], ['Sec', parts.seconds]].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border border-border bg-background px-1 py-2">
              <p className="text-sm font-bold tabular-nums">{String(value).padStart(2, "0")}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
