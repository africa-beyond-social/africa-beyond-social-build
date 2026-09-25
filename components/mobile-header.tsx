"use client"

import Link from "next/link"
import type { Profile } from "@/lib/types"
import { Menu, Home, Compass, Newspaper, PlaySquare, Users, Radio, Library, Bell, Mail, Bookmark, User, Store, Megaphone, Clapperboard } from "lucide-react"
import { BrandMark } from "@/components/brand-logo"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const links = [
  ["/", "Home", Home], ["/explore", "Explore", Compass], ["/news", "News", Newspaper],
  ["/media", "Media", PlaySquare], ["/community", "Community", Users], ["/live", "Live", Radio],
  ["/newsroom", "Newsroom", Newspaper], ["/knowledge", "Knowledge", Library],
  ["/notifications", "Notifications", Bell], ["/messages", "Messages", Mail], ["/bookmarks", "Bookmarks", Bookmark],
] as const

export function MobileHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 md:hidden">
      <Link href="/" aria-label="WIGOD Home" className="flex items-center gap-2">
        <BrandMark className="size-8" />
        <span className="font-bold tracking-tight">WIGOD</span>
      </Link>
      <Dialog>
        <DialogTrigger aria-label="Open WIGOD navigation" className="flex size-10 items-center justify-center rounded-full border border-border bg-background hover:bg-secondary">
          <Menu className="size-6" />
          <span className="sr-only">Open WIGOD navigation</span>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BrandMark className="size-7" />WIGOD Navigation</DialogTitle>
            <DialogDescription>Access all major areas of WIGOD from your phone.</DialogDescription>
          </DialogHeader>
          <nav className="grid gap-1">
            {links.map(([href, label, Icon]) => (
              <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-secondary">
                <Icon className="size-5 text-muted-foreground" />{label}
              </Link>
            ))}
            <div className="my-1 border-t border-border" />
            <Link href={profile ? `/profile/${profile.username}` : "/auth/login"} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-secondary"><User className="size-5 text-muted-foreground" />Profile</Link>
            <Link href="/marketplace" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-secondary"><Store className="size-5 text-muted-foreground" />Marketplace</Link>
            <Link href="/advertise" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-secondary"><Megaphone className="size-5 text-muted-foreground" />Advertise</Link>
            <Link href="/live/studio" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium hover:bg-secondary"><Clapperboard className="size-5 text-muted-foreground" />Creator Studio</Link>
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  )
}
