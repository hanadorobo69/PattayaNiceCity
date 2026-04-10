"use client"

import { useRouter, usePathname } from "@/i18n/navigation"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  fallbackHref?: string
  label?: string
  /** Render as a layout-level back button (inline, not fixed) */
  floating?: boolean
}

export function BackButton({ fallbackHref = "/", label = "Back", floating }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show back button on top-level tab pages (only show when going deeper, e.g. a specific spot or post)
  const topLevelPages = ["/", "", "/about", "/community", "/members", "/vlogs", "/messages", "/login", "/contact", "/legal"]
  const isHome = topLevelPages.some(p => pathname === p)
    || pathname.startsWith("/vlogs/category") || pathname.startsWith("/vlogs/tag")
    || pathname === "/admin" || pathname.startsWith("/profile")

  function handleBack(e: React.MouseEvent) {
    e.preventDefault()
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  if (floating && isHome) return null

  if (floating) {
    return (
      <button
        onClick={handleBack}
        className="fixed top-[5.25rem] left-4 z-40 hidden lg:flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-[#e8a840] via-[#e07850] to-[#3db8a0] shadow-[0_0_20px_rgba(232,168,64,0.35)] hover:shadow-[0_0_30px_rgba(232,168,64,0.55)] hover:scale-110 transition-all cursor-pointer group"
        title="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-white group-hover:-translate-x-0.5 transition-transform" />
      </button>
    )
  }

  return (
    <button
      onClick={handleBack}
      className="hidden sm:inline-flex items-center gap-1 text-sm text-[#e8a840] hover:text-[#3db8a0] transition-colors group cursor-pointer"
    >
      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  )
}
