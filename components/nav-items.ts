import {
  Home,
  Compass,
  Newspaper,
  PlaySquare,
  Users,
  Radio,
  Bell,
  Mail,
  Bookmark,
  User,
  ShoppingBag,
  PenSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

export function buildNavItems(username: string | null): NavItem[] {
  const profileHref = username ? `/profile/${username}` : "/auth/login"
  return [
    { label: "Home", href: "/", icon: Home, match: (p) => p === "/" },
    { label: "Explore", href: "/explore", icon: Compass, match: (p) => p.startsWith("/explore") },
    { label: "Media", href: "/media", icon: PlaySquare, match: (p) => p.startsWith("/media") },
    { label: "Live", href: "/live", icon: Radio, match: (p) => p.startsWith("/live") },
    { label: "Community", href: "/community", icon: Users, match: (p) => p.startsWith("/community") },
    { label: "Messages", href: "/messages", icon: Mail, match: (p) => p.startsWith("/messages") },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, match: (p) => p.startsWith("/marketplace") },
    { label: "Publisher", href: "/publisher", icon: PenSquare, match: (p) => p.startsWith("/publisher") },
    { label: "Notifications", href: "/notifications", icon: Bell, match: (p) => p.startsWith("/notifications") },
    { label: "Bookmarks", href: "/bookmarks", icon: Bookmark, match: (p) => p.startsWith("/bookmarks") },
    { label: "Profile", href: profileHref, icon: User, match: (p) => p.startsWith("/profile") },
    { label: "More", href: "#", icon: MoreHorizontal, match: () => false },
  ]
}
