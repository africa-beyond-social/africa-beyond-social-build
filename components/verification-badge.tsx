import { BadgeCheck, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type VerificationType = "wigod_staff" | "wigod_official" | "creator" | "organization" | null

export function VerificationBadge({
  type,
  size = "sm",
  showLabel = false,
}: {
  type: VerificationType
  size?: "xs" | "sm" | "md"
  showLabel?: boolean
}) {
  if (!type) return null

  const isWigod = type === "wigod_staff" || type === "wigod_official"
  const label =
    type === "wigod_staff" ? "WIGOD Staff" :
    type === "wigod_official" ? "Official WIGOD" :
    type === "creator" ? "Creator Verified" :
    "Organization Verified"

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        isWigod ? "text-brand-red" : "text-brand-green",
        size === "xs" && "text-[10px]",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
      )}
    >
      {isWigod ? <ShieldCheck className={cn(size === "xs" ? "size-3.5" : size === "sm" ? "size-4" : "size-5")} /> : <BadgeCheck className={cn(size === "xs" ? "size-3.5" : size === "sm" ? "size-4" : "size-5")} />}
      {showLabel && <span>{label}</span>}
    </span>
  )
}
