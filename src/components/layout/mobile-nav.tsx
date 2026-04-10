"use client"

import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Users, PenSquare, LogIn, Shield, User, Crown, MessageCircle, MapPin, Info, ShoppingBag } from "lucide-react"
import { UnreadBadge } from "@/components/messages/unread-badge"
import { NotificationBadge } from "@/components/notifications/notification-badge"
import { useTheme } from "@/components/theme-provider"

interface MobileNavUser {
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  isAdmin?: boolean
}

interface MobileNavProps {
  user: MobileNavUser | null
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const t = useTranslations("mobile")
  const { theme } = useTheme()
  const isLight = theme === "nicecity-light"

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const items = [
    { href: "/", label: t("spots"), icon: MapPin },
    { href: "/community", label: t("community"), icon: Users },
    ...(user ? [{ href: "/create", label: t("post"), icon: PenSquare }] : []),
    ...(user ? [{ href: "/members", label: "Squad", icon: Crown }] : []),
    { href: "/about", label: "About", icon: Info },
    ...(user
      ? [{ href: `/profile/${user.username}`, label: t("profile"), icon: User, showNotifBadge: true }]
      : [{ href: "/login", label: t("signIn"), icon: LogIn }]
    ),
    ...(user?.isAdmin ? [{ href: "/admin", label: t("admin"), icon: Shield }] : []),
  ]

  const navBg = isLight
    ? "rgba(245,238,255,0.95)"
    : "rgba(10,7,20,0.82)"

  const borderColor = isLight
    ? "rgba(184,134,11,0.25)"
    : "rgba(232,168,64,0.25)"

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderTop: `1px solid ${borderColor}`,
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0" style={{ background: navBg, backdropFilter: "blur(10px)" }} />

      <div className="relative flex items-center h-14 px-1 max-w-lg mx-auto">
        {items.map(item => {
          const active = isActive(item.href)
          const Icon = (item as any).icon

          // Active: gradient (dark) / rose (light). Inactive: clearly muted.
          const iconColor = active
            ? isLight ? "#b8860b" : "#e8a840"
            : isLight ? "#9b72c0" : "#6b5080"

          const labelClass = active
            ? isLight
              ? "text-[9px] font-semibold text-[#b8860b]"
              : "text-[9px] font-semibold bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent"
            : "text-[9px] font-medium text-muted-foreground"

          const underlineClass = active
            ? isLight
              ? "h-0.5 w-3/4 max-w-[2rem] rounded-full bg-gradient-to-r from-[#b8860b] to-[#c06040]"
              : "h-0.5 w-3/4 max-w-[2rem] rounded-full bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0]"
            : ""

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 transition-colors min-w-0"
            >
              <span className="relative">
                <Icon className="h-5 w-5" style={{ color: iconColor }} />
                {"showBadge" in item && item.showBadge && <UnreadBadge />}
                {"showNotifBadge" in item && item.showNotifBadge && <NotificationBadge />}
              </span>
              <span className={labelClass}>{item.label}</span>
              {active && <span className={underlineClass} />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
