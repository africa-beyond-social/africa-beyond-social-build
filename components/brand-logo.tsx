import Image from "next/image"
import { cn } from "@/lib/utils"

const OFFICIAL_LOGO = "/1000276350.png"

/** Official Africa & Beyond logo asset uploaded to the repository. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-12 shrink-0 overflow-hidden rounded-xl bg-black", className)}>
      <Image
        src={OFFICIAL_LOGO}
        alt="Africa & Beyond"
        fill
        sizes="48px"
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
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className="size-12" />
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
