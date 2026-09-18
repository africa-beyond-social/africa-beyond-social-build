import Image from "next/image"
import { cn } from "@/lib/utils"

const WIGOD_MARK = "/branding/Wigod-mark.png"
const WIGOD_WORDMARK = "/branding/Wigod-wordmark.png"

/** Official WIGOD mark supplied for the product brand. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden", className)}>
      <Image
        src={WIGOD_MARK}
        alt="WIGOD"
        fill
        sizes="(max-width: 768px) 120px, 180px"
        className="object-contain"
        priority
      />
    </span>
  )
}

/** Official WIGOD wordmark and tagline supplied for the product brand. */
export function BrandWordmark({
  className,
  showTagline = false,
}: {
  className?: string
  showTagline?: boolean
}) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden", className)}>
      <Image
        src={WIGOD_WORDMARK}
        alt="WIGOD — People. Places. Perspectives."
        fill
        sizes={showTagline ? "(max-width: 768px) 240px, 360px" : "(max-width: 768px) 180px, 280px"}
        className="object-contain"
        priority
      />
    </span>
  )
}
