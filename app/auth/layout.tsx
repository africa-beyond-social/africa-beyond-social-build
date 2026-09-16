import type { ReactNode } from "react"
import { BrandWordmark } from "@/components/brand-logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-secondary/40">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <BrandWordmark showTagline />
          </div>
          {children}
        </div>
        <p className="mt-8 max-w-sm text-center text-xs text-muted-foreground">
          Africa &amp; Beyond Social — a professional space for African voices and the global diaspora.
        </p>
      </div>
    </main>
  )
}
