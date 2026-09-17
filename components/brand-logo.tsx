import Image from "next/image"
import { cn } from "@/lib/utils"

// The official logo was uploaded at the repository root. Use its public raw
// GitHub asset URL until the binary can be moved into /public/branding.
const OFFICIAL_LOGO = "https://raw.githubusercontent.com/africa-beyond-social/africa-beyond-social-build/stage-1-home-feed/1000276350.png"

/** Official Africa & Beyond logo asset. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden", className)}>
      <Image
        src={OFFICIAL_LOGO}
        alt="Africa & Beyond"
        fill
        sizes="(max-width: 768px) 120px, 180px"
        className="object-contain"
        unoptimized
        priority
      />
    </span>
  )
}

export function BrandWordmark({
  className,
  showTagline = false,
}: {
  className?: string
  showTagline?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className="h-14 w-28 lg:h-16 lg:w-36" />
      <div className="flex min-w-0 flex-col leading-none">
        <span className="text-[0.95rem] font-extrabold tracking-tight text-foreground">
          AFRICA &amp; BEYOND SOCIAL
        </span>
        <span className="mt-1 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
          {showTagline ? "People. Places. Perspectives." : "Social"}
        </span>
      </div>
    </div>
  )
}
