import { Home, Compass, Bell, User, type LucideIcon } from "lucide-react"

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
    { label: "Notifications", href: "/notifications", icon: Bell, match: (p) => p.startsWith("/notifications") },
    { label: "Profile", href: profileHref, icon: User, match: (p) => p.startsWith("/profile") },
  ]
}
