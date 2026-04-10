"use client"

import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useTheme } from "@/components/theme-provider"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface Cat {
  id: string
  slug: string
  name: string
  icon: string | null
  sortOrder?: number
}

interface Props {
  categories: Cat[]
  currentCategory: string | undefined
  searchParamsStr: string
}

const GROUPS = [
  { label: "Services",              color: "#5C6BC0", range: [100, 199] },
  { label: "Accommodation",         color: "#e8a840", range: [200, 299] },
  { label: "Food & Drink",          color: "#e07850", range: [300, 399] },
  { label: "Nightlife Soft",        color: "#AB47BC", range: [400, 499] },
  { label: "Activities",            color: "#29B6F6", range: [500, 599] },
  { label: "Nature & Beaches",      color: "#4FC3F7", range: [600, 699] },
  { label: "Shopping & Markets",    color: "#FFA726", range: [700, 799] },
  { label: "Wellness",              color: "#3db8a0", range: [800, 899] },
  { label: "Sport & Adventure",     color: "#EF5350", range: [900, 999] },
  { label: "Kids & Family",         color: "#FF8A65", range: [1000, 1099] },
  { label: "Transport",             color: "#78909C", range: [1100, 1199] },
  { label: "Admin & Info",          color: "#7986CB", range: [1200, 1299] },
] as const

export function SpotsSidebarCategories({ categories, currentCategory, searchParamsStr }: Props) {
  const t = useTranslations("spots")
  const tc = useTranslations("categoryNames")
  const { theme } = useTheme()
  const isLight = theme === "nicecity-light"
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  function buildUrl(slug?: string) {
    const p = new URLSearchParams(searchParamsStr)
    p.delete("category")
    p.delete("q")
    if (slug) p.set("category", slug)
    const qs = p.toString()
    return qs ? `/?${qs}` : "/"
  }

  const base = "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all cursor-pointer"

  function linkClass(slug?: string) {
    const active = slug ? currentCategory === slug : !currentCategory
    if (active) return isLight
      ? `${base} bg-gradient-to-r from-[#b8860b] to-[#c06040] text-white shadow-[0_0_14px_rgba(184,134,11,0.35)]`
      : `${base} bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)]`
    return isLight
      ? `${base} text-[#1a1510] hover:bg-[rgba(184,134,11,0.08)] hover:text-[#b8860b]`
      : `${base} text-muted-foreground hover:bg-[rgba(232,168,64,0.07)] hover:text-[#3db8a0]`
  }

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="space-y-0.5">
      <Link href={buildUrl(undefined)} className={linkClass()}>
        <span className="text-base leading-none">✨</span> {t("all")}
      </Link>

      {GROUPS.map(({ label, color, range }) => {
        const groupCats = categories
          .filter(c => (c.sortOrder ?? 99) >= range[0] && (c.sortOrder ?? 99) <= range[1])
          .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
        if (groupCats.length === 0) return null
        const isCollapsed = collapsed[label]
        const hasActive = groupCats.some(c => c.slug === currentCategory)

        return (
          <div key={label}>
            <button
              onClick={() => toggleGroup(label)}
              className="w-full flex items-center gap-2 px-2.5 pt-3 pb-1 cursor-pointer group"
            >
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}66, transparent)` }} />
              <span
                className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                style={{ color: `${color}cc` }}
              >
                {label}
                {hasActive && !isCollapsed ? null : (
                  <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                )}
              </span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}66, transparent)` }} />
            </button>
            {!isCollapsed && groupCats.map(cat => (
              <Link key={cat.id} href={buildUrl(cat.slug)} className={linkClass(cat.slug)}>
                {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                {tc.has(cat.slug) ? tc(cat.slug) : cat.name}
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
