import Image from "next/image"
import { cn } from "@/lib/utils"

const WIGOD_MARK = "/branding/wigod-mark.png"
const WIGOD_WORDMARK = "/branding/wigod-wordmark.png"

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
        sizes="(max-width: 768px) 240px, 360px"
        className="object-contain"
        priority
      />
    </span>
  )
}
