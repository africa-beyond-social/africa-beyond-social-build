import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { LeftSidebar } from "@/components/left-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { MobileHeader } from "@/components/mobile-header"
import { Toaster } from "@/components/ui/sonner"
import { getCurrentProfile, getSessionUser, getUnreadNotificationCount } from "@/lib/queries"
import { ensureProfile } from "@/lib/actions"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  await ensureProfile()

  const [profile, unreadCount] = await Promise.all([
    getCurrentProfile(),
    getUnreadNotificationCount(user.id),
  ])

  return (
    <div className="mx-auto flex h-dvh w-full max-w-6xl overflow-hidden">
      <div className="hidden h-dvh shrink-0 overflow-y-auto md:block">
        <LeftSidebar profile={profile} unreadCount={unreadCount} />
      </div>

      <div className="flex h-dvh min-w-0 flex-1 flex-col border-border md:border-x">
        <MobileHeader profile={profile} />
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-10">{children}</main>
      </div>

      <MobileNav profile={profile} unreadCount={unreadCount} />
      <Toaster position="top-center" />
    </div>
  )
}
