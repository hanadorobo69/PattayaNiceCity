import createIntlMiddleware from "next-intl/middleware"
import { auth } from "@/auth"
import { routing } from "@/i18n/routing"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createIntlMiddleware(routing)

// Page paths that require authentication (after locale prefix is stripped)
const authPaths = ["/create", "/profile", "/admin"]

function needsAuth(pathname: string): boolean {
  return authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

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

// Paths that bypass the coming-soon gate (auth flow must work)
const PUBLIC_PATHS = ["/coming-soon", "/login", "/register", "/api/auth"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export default async function middleware(req: NextRequest) {
  const realPath = stripLocale(req.nextUrl.pathname)

  // Always allow public paths (coming-soon, auth flow)
  if (isPublicPath(realPath)) {
    return intlMiddleware(req)
  }

  // --- Coming Soon Gate: only admins can access the site ---
  const session = await auth()

  if (!session?.user?.isAdmin) {
    // Not logged in or not admin - redirect to coming-soon
    const comingSoonUrl = new URL("/coming-soon", req.url)
    return NextResponse.redirect(comingSoonUrl)
  }

  // Admin user - allow normal flow
  if (needsAuth(realPath) && !session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return intlMiddleware(req)
}

export const config = {
  // Match all page routes, skip API routes, static files, Next.js internals
  matcher: ["/((?!api|_next|uploads|favicon|icons|flags|manifest\\.json|robots\\.txt|sitemap\\.xml|og-image|logo_hot|.*\\.[a-z]{2,4}$).*)"],
}
