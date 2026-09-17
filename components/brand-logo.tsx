import Image from "next/image"
import { cn } from "@/lib/utils"

const OFFICIAL_LOGO = "/1000276350.png"

/** Official Africa & Beyond artwork. The source artwork is kept unchanged. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden", className)}>
      <Image
        src={OFFICIAL_LOGO}
        alt="Africa & Beyond"
        fill
        sizes="(max-width: 767px) 120px, 180px"
        className="object-contain"
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
    <div className={cn("flex min-w-0 flex-col", className)}>
      <BrandMark className="h-16 w-[170px]" />
      <span className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {showTagline ? "People. Places. Perspectives." : "Social"}
      </span>
    </div>
  )
}
