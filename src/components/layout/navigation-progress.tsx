"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { usePathname } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Navigation complete → hide bar
  useEffect(() => {
    setLoading(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [pathname, searchParams])

  // Intercept clicks on internal links and buttons that trigger navigation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")
      if (anchor) {
        const href = anchor.getAttribute("href")
        if (href && (href.startsWith("/") || href.startsWith("?"))) {
          // Don't show for same URL
          const current = window.location.pathname + window.location.search
          if (href !== current) {
            setLoading(true)
            // Safety: auto-hide after 8s in case navigation gets stuck
            timeoutRef.current = setTimeout(() => setLoading(false), 8000)
          }
        }
      }
    }
    document.addEventListener("click", handler, true)
    return () => document.removeEventListener("click", handler, true)
  }, [])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] hidden md:block">
      <div
        className="h-full rounded-r-full"
        style={{
          background: "linear-gradient(90deg, #e8a840, #e07850, #3db8a0)",
          animation: "nav-progress 2s ease-in-out infinite",
        }}
      />
    </div>
  )
}
