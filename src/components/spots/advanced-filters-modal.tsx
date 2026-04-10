"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { SlidersHorizontal, X, Trash2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

interface FilterState {
  minStars?: string
  price?: string
  pool?: string
  darts?: string
  connect4?: string
  cards?: string
  dices?: string
  beerpong?: string
  consoles?: string
  boardgames?: string
  wifi?: string
  tv?: string
  // Advanced budget
  softMax?: string
  beerMax?: string
  alcoholMax?: string
  ladyDrinkMax?: string
  bottleMax?: string
  tableSmallMax?: string
  tableMediumMax?: string
  tableLargeMax?: string
  barfineMax?: string
  shortTimeMax?: string
  longTimeMax?: string
  bjMax?: string
  boomBoomMax?: string
  smallRoomMax?: string
  roomMax?: string
  thaiMassageMax?: string
  footMassageMax?: string
  oilMassageMax?: string
  coffeeMax?: string
  foodMax?: string
  // NiceCity profile flags
  kidFriendly?: string
  wheelchairOk?: string
  rainyDayOk?: string
  parking?: string
  laptopFriendly?: string
  petFriendly?: string
  familyFriendly?: string
}

const ALL_FILTER_KEYS: (keyof FilterState)[] = [
  "minStars", "price",
  "pool", "darts", "connect4", "cards", "dices", "beerpong", "consoles", "boardgames", "wifi", "tv",
  "softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax",
  "tableSmallMax", "tableMediumMax", "tableLargeMax",
  "barfineMax", "shortTimeMax", "longTimeMax",
  "bjMax", "boomBoomMax", "smallRoomMax", "roomMax",
  "thaiMassageMax", "footMassageMax", "oilMassageMax",
  "coffeeMax", "foodMax",
  "kidFriendly", "wheelchairOk", "rainyDayOk", "parking", "laptopFriendly", "petFriendly", "familyFriendly",
]

const DRINK_FIELDS = [
  { key: "softMax", labelKey: "softDrink", emoji: "🥤", step: 10 },
  { key: "beerMax", labelKey: "beer", emoji: "🍺", step: 10 },
  { key: "alcoholMax", labelKey: "alcohol", emoji: "🥃", step: 10 },
  { key: "bottleMax", labelKey: "bottle", emoji: "🍾", step: 100 },
  { key: "ladyDrinkMax", labelKey: "ladyDrink", emoji: "💋", step: 10 },
] as const

const BARFINE_FIELDS = [
  { key: "barfineMax", labelKey: "barfine", emoji: "💸", step: 1000 },
  { key: "shortTimeMax", labelKey: "shortTime", emoji: "⏱", step: 1000 },
  { key: "longTimeMax", labelKey: "longTime", emoji: "🌙", step: 1000 },
] as const

const SERVICE_FIELDS = [
  { key: "smallRoomMax", labelKey: "smallRoom", emoji: "🛏", step: 100 },
  { key: "roomMax", labelKey: "room", emoji: "🛏", step: 100 },
  { key: "bjMax", labelKey: "bj", emoji: "💦", step: 1000 },
  { key: "boomBoomMax", labelKey: "boomBoom", emoji: "🔥", step: 1000 },
] as const

const TABLE_FIELDS = [
  { key: "tableSmallMax", labelKey: "smallTable", emoji: "🪑", step: 1000 },
  { key: "tableMediumMax", labelKey: "mediumTable", emoji: "🪑", step: 1000 },
  { key: "tableLargeMax", labelKey: "vipTable", emoji: "👑", step: 1000 },
] as const

const MASSAGE_FIELDS = [
  { key: "thaiMassageMax", labelKey: "thaiMassage", emoji: "🙏", step: 100 },
  { key: "footMassageMax", labelKey: "footMassage", emoji: "🦶", step: 100 },
  { key: "oilMassageMax", labelKey: "oilMassage", emoji: "💆", step: 100 },
] as const

const COFFEE_FIELDS = [
  { key: "coffeeMax", labelKey: "coffee", emoji: "🌿", step: 10 },
  { key: "foodMax", labelKey: "food", emoji: "🚬", step: 10 },
] as const

const PROFILE_OPTIONS = [
  { key: "kidFriendly", label: "Kid-Friendly", emoji: "👶" },
  { key: "familyFriendly", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { key: "wheelchairOk", label: "Wheelchair", emoji: "♿" },
  { key: "rainyDayOk", label: "Rainy Day", emoji: "🌧️" },
  { key: "parking", label: "Parking", emoji: "🅿️" },
  { key: "laptopFriendly", label: "Laptop OK", emoji: "💻" },
  { key: "petFriendly", label: "Pet-Friendly", emoji: "🐾" },
] as const

interface AdvancedFiltersModalProps {
  currentValues: FilterState
  showGames: boolean
  visiblePriceFields: string[]
  activeCount: number
  label?: string
}

export function AdvancedFiltersModal({ currentValues, showGames, visiblePriceFields, activeCount, label }: AdvancedFiltersModalProps) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<FilterState>(currentValues)
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("spots")
  const tp = useTranslations("priceFilters")
  const { theme } = useTheme()
  const isLight = theme === "nicecity-light"

  // Sync when URL changes
  useEffect(() => {
    setLocal(currentValues)
  }, [currentValues])

  const apply = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    // Set simple filters
    if (local.minStars) params.set("minStars", local.minStars); else params.delete("minStars")
    if (local.price) params.set("price", local.price); else params.delete("price")
    // Games
    for (const key of ["pool", "darts", "connect4", "cards", "dices", "beerpong", "consoles", "boardgames", "wifi", "tv"] as const) {
      if (local[key] === "true") params.set(key, "true"); else params.delete(key)
    }
    // Profile flags
    for (const key of ["kidFriendly", "wheelchairOk", "rainyDayOk", "parking", "laptopFriendly", "petFriendly", "familyFriendly"] as const) {
      if (local[key] === "true") params.set(key, "true"); else params.delete(key)
    }
    // Budget fields
    for (const f of [...DRINK_FIELDS, ...BARFINE_FIELDS, ...SERVICE_FIELDS, ...TABLE_FIELDS, ...MASSAGE_FIELDS, ...COFFEE_FIELDS]) {
      const val = local[f.key as keyof FilterState]?.trim()
      if (val && !isNaN(Number(val)) && Number(val) > 0) params.set(f.key, val); else params.delete(f.key)
    }
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false } as any)
    setOpen(false)
  }, [local, router, pathname])

  // Close on Escape - auto-apply filters
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") apply() }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, apply])

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Intercept mobile back button: close filters instead of navigating back
  useEffect(() => {
    if (!open) return
    window.history.pushState({ filtersPanel: true }, "")
    const onPopState = () => {
      apply()
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [open, apply])

  const vis = new Set(visiblePriceFields)
  const drinks = DRINK_FIELDS.filter(f => vis.has(f.key))
  const barfine = BARFINE_FIELDS.filter(f => vis.has(f.key))
  const services = SERVICE_FIELDS.filter(f => vis.has(f.key))
  const tables = TABLE_FIELDS.filter(f => vis.has(f.key))
  const massages = MASSAGE_FIELDS.filter(f => vis.has(f.key))
  const coffees = COFFEE_FIELDS.filter(f => vis.has(f.key))
  const hasBudgetFields = drinks.length + barfine.length + services.length + tables.length + massages.length + coffees.length > 0

  function clearAll() {
    const params = new URLSearchParams(window.location.search)
    for (const key of ALL_FILTER_KEYS) params.delete(key)
    // Also clear all other filter params to match the page Clear button
    for (const extra of ["openNow", "fireSpot", "district", "verified", "newOnly"]) {
      params.delete(extra)
    }
    setLocal({})
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false } as any)
    setOpen(false)
  }

  const toggleFilter = (key: keyof FilterState, value: string) => {
    setLocal(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }))
  }

  const toggleGame = (key: keyof FilterState) => {
    setLocal(prev => ({ ...prev, [key]: prev[key] === "true" ? undefined : "true" }))
  }

  // Count active advanced filters (inside modal scope)
  const advancedCount = activeCount

  const starOptions = [
    { value: "2", label: "2+ ★" },
    { value: "3", label: "3+ ★" },
    { value: "4", label: "4+ ★" },
    { value: "4.5", label: "4.5+ ★" },
  ]

  const priceOptions = [
    { value: "$", label: t("budget") },
    { value: "$$", label: t("mid") },
    { value: "$$$", label: t("premium") },
  ]

  const gameOptions = [
    { key: "pool" as const, label: `🎱 ${t("pool")}` },
    { key: "darts" as const, label: `🎯 ${t("darts")}` },
    { key: "connect4" as const, label: `🔴 ${t("connect4")}` },
    { key: "cards" as const, label: `🃏 ${t("cards")}` },
    { key: "dices" as const, label: `🎲 ${t("dices")}` },
    { key: "beerpong" as const, label: `🏓 ${t("beerPong")}` },
    { key: "consoles" as const, label: `🎮 ${t("consoles")}` },
    { key: "boardgames" as const, label: `♟️ ${t("boardGames")}` },
    { key: "wifi" as const, label: `📶 ${t("wifi")}` },
    { key: "tv" as const, label: `📺 ${t("tv")}` },
  ]

  function renderPriceFields(fields: readonly { key: string; labelKey: string; emoji: string; step: number }[]) {
    return fields.map(({ key, labelKey, emoji, step }) => (
      <div key={key} className="space-y-1">
        <label className="text-xs text-muted-foreground">{emoji} {tp(labelKey)}</label>
        <input
          type="number"
          min={0}
          step={step}
          placeholder="max ฿"
          value={local[key as keyof FilterState] ?? ""}
          onChange={(e) => {
            const v = e.target.value
            setLocal(prev => ({ ...prev, [key]: v === "0" ? "" : v }))
          }}
          className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(232,168,64,0.30)] focus:border-[rgba(232,168,64,0.50)] transition-colors placeholder:text-[rgba(183,148,212,0.60)]"
        />
      </div>
    ))
  }

  function renderSeparator(label: string, color: string) {
    return (
      <div className="col-span-full flex items-center gap-2 pt-2 pb-0.5">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}aa` }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }} />
      </div>
    )
  }

  const pillClass = (active: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-medium text-center cursor-pointer transition-all ${
      active
        ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)]"
        : isLight
          ? "bg-[rgba(184,134,11,0.07)] border border-[rgba(184,134,11,0.20)] text-[#3a1a5a] hover:border-[rgba(184,134,11,0.4)] hover:text-[#b8860b]"
          : "glass-card text-muted-foreground hover:border-[rgba(232,168,64,0.4)] hover:text-[#3db8a0]"
    }`

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`category-pill flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
          advancedCount > 0
            ? "bg-[rgba(61,184,160,0.15)] text-[#3db8a0] border border-[rgba(61,184,160,0.40)] shadow-[0_0_10px_rgba(61,184,160,0.20)]"
            : "bg-[rgba(61,184,160,0.08)] text-[#3db8a0] border border-[rgba(61,184,160,0.25)] hover:bg-[rgba(61,184,160,0.15)] hover:border-[rgba(61,184,160,0.40)]"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>{label ?? t("filters")}</span>
        {advancedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8a840] text-white leading-none">
            {advancedCount}
          </span>
        )}
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-[170] flex justify-end">
          {/* Backdrop - dimmed, click to close & auto-apply */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={apply} />

          {/* Drawer panel - slides from right */}
          <div className={`relative w-full max-w-[400px] h-full border-l shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ${isLight ? "bg-[#f5eeff] border-[rgba(184,134,11,0.20)]" : "bg-[#1a1510] border-[rgba(232,168,64,0.20)]"}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isLight ? "border-[rgba(184,134,11,0.15)]" : "border-[rgba(232,168,64,0.15)]"}`}>
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="h-4.5 w-4.5 text-[#3db8a0]" />
                <h2 className="text-base font-bold text-foreground">Advanced Filters</h2>
                {advancedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8a840] text-white leading-none">
                    {advancedCount}
                  </span>
                )}
              </div>
              <button type="button" onClick={apply} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Rating */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f43] animate-pulse" />{t("ratingAndStatus")}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {starOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => toggleFilter("minStars", opt.value)}
                      className={pillClass(local.minStars === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e07850] animate-pulse" />{t("priceRangeLabel")}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {priceOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => toggleFilter("price", opt.value)}
                      className={pillClass(local.price === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Games & Amenities */}
              {showGames && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3db8a0] animate-pulse" />{t("gamesAndAmenities")}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {gameOptions.map(g => (
                      <button key={g.key} type="button" onClick={() => toggleGame(g.key)}
                        className={pillClass(local[g.key] === "true")}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile & Ambiance */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3db8a0] animate-pulse" />Profile & Ambiance
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {PROFILE_OPTIONS.map(p => (
                    <button key={p.key} type="button" onClick={() => toggleGame(p.key as keyof FilterState)}
                      className={pillClass(local[p.key as keyof FilterState] === "true")}>
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Budget */}
              {hasBudgetFields && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e8a840] animate-pulse" />{tp("maxBudget")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                    {drinks.length > 0 && <>{renderSeparator(tp("drinks"), "#3db8a0")}{renderPriceFields(drinks)}</>}
                    {tables.length > 0 && <>{renderSeparator(tp("tables"), "#e07850")}{renderPriceFields(tables)}</>}
                    {barfine.length > 0 && <>{renderSeparator(tp("barfineStLt"), "#ff9f43")}{renderPriceFields(barfine)}</>}
                    {services.length > 0 && <>{renderSeparator(tp("services"), "#e8a840")}{renderPriceFields(services)}</>}
                    {coffees.length > 0 && <>{renderSeparator(tp("coffeeFood"), "#22C55E")}{renderPriceFields(coffees)}</>}
                    {massages.length > 0 && <>{renderSeparator(tp("massage"), "#10B981")}{renderPriceFields(massages)}</>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center gap-2 px-5 py-4 border-t ${isLight ? "border-[rgba(184,134,11,0.15)]" : "border-[rgba(232,168,64,0.15)]"}`}>
              <button
                type="button"
                onClick={apply}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-border hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
