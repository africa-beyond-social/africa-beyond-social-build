"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buildNavItems } from "@/components/nav-items"
import { ComposeDialog } from "@/components/compose-dialog"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { Feather } from "lucide-react"

export function MobileNav({ profile, unreadCount }: { profile: Profile | null; unreadCount: number }) {
  const pathname = usePathname()
  const items = buildNavItems(profile?.username ?? null)

  return (
    <>
      <ComposeDialog profile={profile}>
        <button
          aria-label="Create post"
          className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand-red text-white shadow-lg shadow-brand-red/30 transition-transform active:scale-95 md:hidden"
        >
          <Feather className="size-6" />
        </button>
      </ComposeDialog>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {items.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          const isNotifications = item.label === "Notifications"
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium"
            >
              <span className="relative">
                <Icon
                  className={cn("size-6", active ? "text-brand-red" : "text-muted-foreground")}
                  strokeWidth={active ? 2.5 : 2}
                />
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[0.55rem] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
