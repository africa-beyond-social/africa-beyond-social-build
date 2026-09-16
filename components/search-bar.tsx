"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore")
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search people and posts"
        aria-label="Search people and posts"
        className="w-full rounded-full border border-border bg-secondary/60 py-2.5 pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:bg-background"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("")
            router.push("/explore")
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  )
}
