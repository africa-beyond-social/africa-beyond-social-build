"use client"

import { useEffect, useRef } from "react"
import { markNotificationsRead } from "@/lib/actions"

export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  const done = useRef(false)
  useEffect(() => {
    if (!hasUnread || done.current) return
    done.current = true
    markNotificationsRead()
  }, [hasUnread])
  return null
}
