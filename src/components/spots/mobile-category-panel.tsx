"use client"

import { useState, useEffect, useCallback } from "react"
import { Link } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { SlidersHorizontal, ChevronDown } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

interface Category {
  id: string
  slug: string
  name: string
  icon: string | null
  sortOrder?: number
}

interface MobileCategoryPanelProps {
  categories: Category[]
  basePath?: string
  grouped?: boolean
  showExtras?: boolean
  compact?: boolean
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

// Post-only categories displayed separately in community mode
const POST_ONLY_RANGE = [1300, 1399] as const

export function MobileCategoryPanel({ categories, basePath = "/", grouped = true, showExtras = false, compact = false }: MobileCategoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const searchParams = useSearchParams()
  const t = useTranslations("spots")
  const tcat = useTranslations("categoryNames")
  const { theme } = useTheme()
  const isLight = theme === "nicecity-light"
  const currentCategory = searchParams.get("category") ?? undefined

  const buildUrl = useCallback((slug?: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete("q")
    if (slug) {
      p.set("category", slug)
    } else {
      p.delete("category")
    }
    const s = p.toString()
    return s ? `${basePath}?${s}` : basePath
  }, [searchParams, basePath])

  useEffect(() => { setOpen(false) }, [searchParams])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    window.history.pushState({ categoryPanel: true }, "")
    const onPopState = () => { setOpen(false) }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [open])

  const activeLabel = currentCategory
    ? categories.find(c => c.slug === currentCategory)
    : null

  const linkClass = (slug?: string) => {
    const active = slug ? currentCategory === slug : !currentCategory
    if (active) {
      return isLight
        ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-[#b8860b] to-[#c06040] text-white shadow-[0_0_14px_rgba(184,134,11,0.35)]"
        : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)]"
    }
    return isLight
      ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#1a1510] hover:bg-[rgba(184,134,11,0.08)] hover:text-[#b8860b]"
      : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[rgba(240,230,255,0.70)] hover:bg-[rgba(232,168,64,0.08)] hover:text-[#e8a840]"
  }

  const close = () => setOpen(false)

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
  }

  // For community mode: show post-only categories
  const postOnlyCats = categories.filter(c => {
    const so = c.sortOrder ?? 99
    return so >= POST_ONLY_RANGE[0] && so <= POST_ONLY_RANGE[1]
  })

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full font-medium transition-all cursor-pointer border border-[rgba(232,168,64,0.25)] bg-[rgba(232,168,64,0.06)] hover:bg-[rgba(232,168,64,0.12)] text-[#e8a840] ${compact ? "px-2.5 py-1.5 text-xs shrink-0" : "px-3.5 py-2 text-sm"}`}
      >
        <SlidersHorizontal className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {activeLabel ? (
          <span>{activeLabel.icon} {tcat.has(activeLabel.slug) ? tcat(activeLabel.slug) : activeLabel.name}</span>
        ) : (
          <span>{compact ? t("categories") : t("allCategories")}</span>
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-[170]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={close}
          />

          <div
            className="category-panel absolute left-0 top-0 bottom-0 w-72 flex flex-col animate-in slide-in-from-left duration-300"
            style={isLight ? {
              background: "linear-gradient(180deg, rgba(248,244,235,0.99) 0%, rgba(240,232,218,0.99) 100%)",
              borderRight: "1px solid rgba(184,134,11,0.20)",
              boxShadow: "4px 0 30px rgba(184,134,11,0.08)",
              color: "#1a1510",
            } : {
              background: "linear-gradient(180deg, rgba(26,21,16,0.98) 0%, rgba(36,28,20,0.98) 100%)",
              borderRight: "1px solid rgba(232,168,64,0.20)",
              boxShadow: "4px 0 30px rgba(232,168,64,0.10)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[rgba(232,168,64,0.15)]">
              <p className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e8a840] animate-pulse" />
                <span className="gradient-text">{t("categories")}</span>
              </p>
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-0.5">
              <Link href={buildUrl(undefined)} onClick={close} className={linkClass()}>
                <span className="text-base">✨</span>
                {t("all")}
              </Link>

              {grouped ? (
                <>
                  {/* Community post-only categories */}
                  {showExtras && postOnlyCats.length > 0 && postOnlyCats.map(cat => (
                    <Link key={cat.id} href={buildUrl(cat.slug)} onClick={close} className={linkClass(cat.slug)}>
                      {cat.icon && <span className="text-base">{cat.icon}</span>}
                      {tcat.has(cat.slug) ? tcat(cat.slug) : cat.name}
                      {currentCategory === cat.slug && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3db8a0]" />}
                    </Link>
                  ))}

                  {/* Venue groups */}
                  {GROUPS.map(({ label, color, range }) => {
                    const groupCats = categories
                      .filter(c => (c.sortOrder ?? 99) >= range[0] && (c.sortOrder ?? 99) <= range[1])
                      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
                    if (groupCats.length === 0) return null
                    const isCollapsed = collapsed[label]

                    return (
                      <div key={label}>
                        <button
                          onClick={() => toggleGroup(label)}
                          className="w-full flex items-center gap-2 px-3 pt-4 pb-1 cursor-pointer"
                        >
                          <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}66, transparent)` }} />
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                            style={{ color: `${color}cc` }}
                          >
                            {label}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                          </span>
                          <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}66, transparent)` }} />
                        </button>
                        {!isCollapsed && groupCats.map(cat => (
                          <Link key={cat.id} href={buildUrl(cat.slug)} onClick={close} className={linkClass(cat.slug)}>
                            {cat.icon && <span className="text-base">{cat.icon}</span>}
                            {tcat.has(cat.slug) ? tcat(cat.slug) : cat.name}
                            {currentCategory === cat.slug && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3db8a0]" />}
                          </Link>
                        ))}
                      </div>
                    )
                  })}
                </>
              ) : (
                categories.map(cat => (
                  <Link key={cat.id} href={buildUrl(cat.slug)} onClick={close} className={linkClass(cat.slug)}>
                    {cat.icon && <span className="text-base">{cat.icon}</span>}
                    {tcat.has(cat.slug) ? tcat(cat.slug) : cat.name}
                    {currentCategory === cat.slug && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3db8a0]" />}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
