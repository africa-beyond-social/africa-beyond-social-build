import { updateSession } from "@/lib/supabase/proxy"
import { NextResponse, type NextRequest } from "next/server"

const PRODUCTION_HOST = "www.africaandbeyond.org"

export async function middleware(request: NextRequest) {
  // Keep the authenticated WIGOD application on the canonical production host.
  // Supabase auth cookies are host-scoped, so opening a Vercel preview URL can
  // otherwise appear logged out even when the user is signed in on production.
  const { hostname, pathname, search } = request.nextUrl
  const isPreviewHost = hostname.endsWith(".vercel.app")
  const isApiRoute = pathname.startsWith("/api/")

  if (isPreviewHost && !isApiRoute) {
    const url = new URL(request.url)
    url.protocol = "https:"
    url.hostname = PRODUCTION_HOST
    url.port = ""
    url.pathname = pathname
    url.search = search
    return NextResponse.redirect(url, 307)
  }

  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
