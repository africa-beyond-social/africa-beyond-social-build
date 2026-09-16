import Link from "next/link"
import { Fragment } from "react"

// Splits post text into plain text, #hashtags, and @mentions with links.
const TOKEN_RE = /(#[\p{L}0-9_]+|@[a-zA-Z0-9_]+)/gu

export function PostContent({ content }: { content: string }) {
  const parts = content.split(TOKEN_RE)
  return (
    <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-foreground">
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return (
            <Link
              key={i}
              href={`/explore?q=${encodeURIComponent(part)}`}
              className="text-brand-red hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        if (part.startsWith("@")) {
          return (
            <Link
              key={i}
              href={`/profile/${part.slice(1)}`}
              className="text-brand-green hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </p>
  )
}
