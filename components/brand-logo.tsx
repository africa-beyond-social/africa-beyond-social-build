import { cn } from "@/lib/utils"

/**
 * Africa & Beyond Social brand mark: a rounded emblem with rising bars
 * (a "beyond"/rising motif) in the brand red, black and green.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex size-9 items-center justify-center rounded-xl bg-foreground", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" role="presentation">
        <rect x="4" y="13" width="4" height="7" rx="1.5" fill="var(--brand-green)" />
        <rect x="10" y="8" width="4" height="12" rx="1.5" fill="#ffffff" />
        <rect x="16" y="4" width="4" height="16" rx="1.5" fill="var(--brand-red)" />
      </svg>
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
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="flex flex-col leading-none">
        <span className="font-serif text-base font-bold tracking-tight text-foreground uppercase">
          Africa <span className="text-brand-red">&amp;</span> Beyond Social
        </span>
        <span className="text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground">
          {showTagline ? "People. Places. Perspectives." : "Social"}
        </span>
      </div>
    </div>
  )
}
