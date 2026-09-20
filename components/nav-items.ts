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
  MoreHorizontal,
  ClipboardList,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

export function buildNavItems(username: string | null, isNewsroomEditor = false): NavItem[] {
  const profileHref = username ? `/profile/${username}` : "/auth/login"
  return [
    { label: "Home", href: "/", icon: Home, match: (p) => p === "/" },
    { label: "Explore", href: "/explore", icon: Compass, match: (p) => p.startsWith("/explore") },
    { label: "News", href: "/news", icon: Newspaper, match: (p) => p.startsWith("/news") },
    ...(isNewsroomEditor ? [{ label: "Newsroom", href: "/newsroom", icon: ClipboardList, match: (p: string) => p.startsWith("/newsroom") }] : []),
    { label: "Media", href: "/media", icon: PlaySquare, match: (p) => p.startsWith("/media") },
    { label: "Community", href: "/community", icon: Users, match: (p) => p.startsWith("/community") },
    { label: "Live", href: "/live", icon: Radio, match: (p) => p.startsWith("/live") },
    { label: "Notifications", href: "/notifications", icon: Bell, match: (p) => p.startsWith("/notifications") },
    { label: "Messages", href: "/messages", icon: Mail, match: (p) => p.startsWith("/messages") },
    { label: "Bookmarks", href: "/bookmarks", icon: Bookmark, match: (p) => p.startsWith("/bookmarks") },
    { label: "Profile", href: profileHref, icon: User, match: (p) => p.startsWith("/profile") },
    { label: "More", href: "#", icon: MoreHorizontal, match: () => false },
  ]
}
