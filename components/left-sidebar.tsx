"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buildNavItems } from "@/components/nav-items"
import { ComposeDialog } from "@/components/compose-dialog"
import { SignOutMenuItem } from "@/components/sign-out-button"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { Feather, MoreHorizontal, Settings } from "lucide-react"

export function LeftSidebar({ profile, unreadCount }: { profile: Profile | null; unreadCount: number }) {
  const pathname = usePathname()
  const items = buildNavItems(profile?.username ?? null)

  return (
    <aside className="flex min-h-full w-full flex-col justify-between px-2 py-4 md:flex lg:px-3">
      <div className="flex flex-col gap-1">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            const isNotifications = item.label === "Notifications"
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-4 rounded-full px-3 py-2.5 text-lg transition-colors hover:bg-secondary lg:justify-start justify-center",
                  active ? "font-bold text-foreground" : "font-medium text-foreground/80",
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-6", active && "text-brand-red")} strokeWidth={active ? 2.5 : 2} />
                  {isNotifications && unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[0.6rem] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <ComposeDialog profile={profile}>
          <Button size="lg" className="mt-4 w-full rounded-full lg:h-11">
            <Feather className="size-5 lg:hidden" />
            <span className="hidden lg:inline">Post</span>
          </Button>
        </ComposeDialog>
      </div>

      {profile && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-3 rounded-full p-2 transition-colors hover:bg-secondary lg:w-full">
                <UserAvatar
                  displayName={profile.display_name}
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  className="size-9 shrink-0"
                />
                <span className="hidden min-w-0 flex-1 flex-col items-start text-left lg:flex">
                  <span className="truncate text-sm font-semibold">{profile.display_name ?? profile.username}</span>
                  <span className="truncate text-xs text-muted-foreground">@{profile.username}</span>
                </span>
                <MoreHorizontal className="hidden size-4 text-muted-foreground lg:block" />
              </button>
            }
          />
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem render={<Link href={`/profile/${profile.username}`} />}>
              <Settings className="size-4" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </aside>
  )
}
