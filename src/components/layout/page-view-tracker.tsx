"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { trackPageView } from "@/actions/analytics"

export function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef("")

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackPageView(pathname)
  }, [pathname])

  return null
}
