"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { buildNavItems } from "@/components/nav-items"
import { ComposeDialog } from "@/components/compose-dialog"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import {
  Feather,
  Store,
  Megaphone,
  Clapperboard,
  MapPin,
  Menu,
  X,
  Newspaper,
  Library,
  Users,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  HelpCircle,
  Shield,
} from "lucide-react"
import { BrandMark } from "@/components/brand-logo"

const menuItems = [
  { label: "Home", href: "/", icon: MapPin },
  { label: "Explore", href: "/explore", icon: MapPin },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Media", href: "/media", icon: Clapperboard },
  { label: "Community", href: "/community", icon: Users },
  { label: "Live", href: "/live", icon: MapPin },
  { label: "Newsroom", href: "/newsroom", icon: Newspaper },
  { label: "Knowledge", href: "/knowledge", icon: Library },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Messages", href: "/messages", icon: Mail },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
]

const utilityItems = [
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Advertise", href: "/advertise", icon: Megaphone },
  { label: "Creator Studio", href: "/live/studio", icon: Clapperboard },
  { label: "Settings & more", href: "/explore", icon: Settings },
  { label: "Help & Support", href: "/help", icon: HelpCircle },
  { label: "Privacy & Safety", href: "/privacy", icon: Shield },
]

export function MobileNav({ profile }: { profile: Profile | null; unreadCount: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const items = buildNavItems(profile?.username ?? null)
  const primaryLabels = ["Home", "Explore", "Live", "Notifications", "Profile"]
  const primaryItems = primaryLabels
    .map((label) => items.find((item) => item.label === label))
    .filter(Boolean)

  const navigate = (href: string) => {
    setMenuOpen(false)
    router.push(href)
  }

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

      <button
        type="button"
        aria-label={menuOpen ? "Close WIGOD navigation" : "Open WIGOD navigation"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="fixed right-3 top-3 z-[60] flex size-11 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm backdrop-blur transition-transform active:scale-95 md:hidden"
      >
        {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
          />
          <div className="fixed right-3 top-16 z-50 max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-xl md:hidden">
            <div className="flex items-center gap-2 border-b border-border px-2 py-2.5">
              <BrandMark className="size-7" />
              <span className="font-bold tracking-wide text-foreground">WIGOD NAVIGATION</span>
            </div>

            <div className="mt-1 grid gap-0.5">
              {menuItems.map(({ label, href, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(href)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted active:bg-muted"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{label}</span>
                </button>
              ))}

              <div className="my-1 h-px bg-border" />

              {utilityItems.map(({ label, href, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(href)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted active:bg-muted"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => navigate(profile ? `/profile/${profile.username}` : "/auth/login")}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted active:bg-muted"
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span>Profile</span>
              </button>
            </div>
          </div>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primaryItems.map((item) => {
          if (!item) return null
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium"
            >
              <Icon
                className={cn("size-5", active ? "text-brand-red" : "text-muted-foreground")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          aria-label="Open WIGOD menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium",
            menuOpen ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <BrandMark className="size-6" />
          <span>WIGOD</span>
        </button>
      </nav>
    </>
  )
}
