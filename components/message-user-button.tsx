"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createDirectConversation } from "@/lib/actions"

export function MessageUserButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  function openConversation() {
    startTransition(async () => {
      const result = await createDirectConversation(targetUserId)
      if (!result.ok) { toast.error(result.error); return }
      router.push(`/messages/${result.conversationId}`)
    })
  }
  return <Button variant="outline" onClick={openConversation} disabled={pending} className="rounded-full"><MessageCircle className="mr-2 size-4" />{pending ? "Opening…" : "Message"}</Button>
}
