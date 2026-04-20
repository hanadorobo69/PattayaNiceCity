import createIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createIntlMiddleware(routing)

// Strip locale prefix to get the real path
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length)
    }
    if (pathname === `/${locale}`) {
      return "/"
    }
  }
  return pathname
}

export default async function middleware(req: NextRequest) {
  const realPath = stripLocale(req.nextUrl.pathname)

  // Only allow /coming-soon - everything else redirects there
  if (realPath === "/coming-soon") {
    return intlMiddleware(req)
  }

  const comingSoonUrl = new URL("/coming-soon", req.url)
  return NextResponse.redirect(comingSoonUrl)
}

export const config = {
  // Match all page routes, skip API routes, static files, Next.js internals
  matcher: ["/((?!api|_next|uploads|favicon|icons|flags|manifest\\.json|robots\\.txt|sitemap\\.xml|og-image|logo_hot|.*\\.[a-z]{2,4}$).*)"],
}
