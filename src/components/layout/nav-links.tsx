"use client"

import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"
import { MapPin, Shield, Info, Heart, Video, Users, ShoppingBag } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Shield, Info, Heart, Video, Users, ShoppingBag,
}

interface NavItem {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
}

interface NavLinksProps {
  items: NavItem[]
}

export function NavLinks({ items }: NavLinksProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const isLight = theme === "nicecity-light"

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {items.map(item => {
        const active = isActive(item.href)
        const Icon = ICON_MAP[item.icon]
        const isAdmin = item.adminOnly
        const showGradient = active && !isAdmin && !isLight

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center justify-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 ${
              isAdmin
                ? active
                  ? "text-[#ff9f43]"
                  : "text-[#ff9f43] hover:text-[#3db8a0]"
                : active
                  ? isLight ? "text-[#b8860b]" : ""
                  : isLight ? "text-[#7a5a40] hover:text-[#b8860b]" : "text-[#e8a840] hover:text-[#3db8a0]"
            }`}
          >
            {Icon && <Icon className={`h-4 w-4 ${showGradient ? "text-[#e8a840]" : ""}`} />}
            {showGradient ? (
              <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent font-semibold">{item.label}</span>
            ) : (
              item.label
            )}
            {active && (
              <span className={`absolute -bottom-0.5 left-[5%] h-0.5 w-[92%] rounded-full ${
                isLight
                  ? "bg-gradient-to-r from-[#b8860b] to-[#c06040]"
                  : "bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0]"
              }`} />
            )}
          </Link>
        )
      })}
    </>
  )
}
