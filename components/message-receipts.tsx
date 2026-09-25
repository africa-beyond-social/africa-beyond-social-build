"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { markConversationDelivered, markConversationRead } from "@/lib/actions"

export function MessageReceipts({ otherUserId }: { otherUserId: string }) {
  const router = useRouter()

  useEffect(() => {
    let active = true

    const update = async () => {
      await markConversationDelivered(otherUserId)
      await markConversationRead(otherUserId)
      if (active) router.refresh()
    }

    void update()
    const timer = window.setInterval(() => void update(), 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [otherUserId, router])

  return null
}
