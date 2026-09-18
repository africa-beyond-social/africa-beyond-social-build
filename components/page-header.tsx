import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string
  subtitle?: string
  backHref?: string
  action?: ReactNode
}) {
  const isWigodHeader = title === "WIGOD"

  return (
    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:top-0">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Go back"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1
          className={`truncate font-bold leading-tight tracking-tight ${
            isWigodHeader ? "text-2xl md:text-3xl" : "text-lg"
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`${isWigodHeader ? "text-sm" : "text-xs"} truncate text-muted-foreground`}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
