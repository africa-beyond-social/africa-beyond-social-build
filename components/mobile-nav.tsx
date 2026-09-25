"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buildNavItems } from "@/components/nav-items"
import { ComposeDialog } from "@/components/compose-dialog"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { Feather, Store, Megaphone, Clapperboard, MapPin } from "lucide-react"
import { BrandMark } from "@/components/brand-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function MobileNav({ profile, unreadCount }: { profile: Profile | null; unreadCount: number }) {
  const pathname = usePathname()
  const items = buildNavItems(profile?.username ?? null)
  const primaryLabels = ["Home", "Explore", "Live", "Notifications", "Profile"]
  const primaryItems = primaryLabels.map((label) => items.find((item) => item.label === label)).filter(Boolean)

  return (
    <>
      <ComposeDialog profile={profile}>
        <button
          aria-label="Create post"
          className="fixed bottom-[4.75rem] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand-red text-white shadow-lg shadow-brand-red/30 transition-transform active:scale-95 md:hidden"
        >
          <Feather className="size-6" />
        </button>
      </ComposeDialog>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primaryItems.map((item) => {
          if (!item) return null
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium"
            >
              <Icon
                className={cn("size-5", active ? "text-brand-red" : "text-muted-foreground")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="WIGOD menu"
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium"
          >
            <BrandMark className="size-6" />
            <span className="text-muted-foreground">WIGOD</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-56 p-2">
            <DropdownMenuLabel className="px-2 py-1.5 font-bold text-foreground">WIGOD</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/marketplace" />}>
              <Store className="text-brand-green" />
              MARKETPLACE
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/advertise" />}>
              <Megaphone className="text-brand-red" />
              ADVERTISE
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/live/studio" />}>
              <Clapperboard className="text-brand-green" />
              CREATOR STUDIO
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/explore" />}>
              <MapPin className="text-[#d4a017]" />
              EXPLORE THE WORLD
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  )
}
