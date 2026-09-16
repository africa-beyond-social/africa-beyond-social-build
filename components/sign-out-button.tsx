"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

export function SignOutMenuItem() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <DropdownMenuItem variant="destructive" onClick={signOut}>
      <LogOut className="size-4" />
      Log out
    </DropdownMenuItem>
  )
}
