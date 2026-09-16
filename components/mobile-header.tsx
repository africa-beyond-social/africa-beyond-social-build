import Link from "next/link"
import { BrandWordmark } from "@/components/brand-logo"
import { UserAvatar } from "@/components/user-avatar"
import type { Profile } from "@/lib/types"

export function MobileHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" aria-label="Africa & Beyond Social home">
        <BrandWordmark />
      </Link>
      {profile && (
        <Link href={`/profile/${profile.username}`} aria-label="Your profile">
          <UserAvatar
            displayName={profile.display_name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            className="size-8"
          />
        </Link>
      )}
    </header>
  )
}
