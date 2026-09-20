import Link from "next/link"
import { BrandWordmark } from "@/components/brand-logo"

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" aria-label="WIGOD home">
        <BrandWordmark className="h-10 w-36" />
      </Link>
    </header>
  )
}
