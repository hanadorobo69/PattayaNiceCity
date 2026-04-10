"use client"

import { useMemo, useState, useCallback, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { useTranslations, useLocale } from "next-intl"
import { MapPin, Clock, Star, MessageSquare, X, Heart, Flame, ClipboardCheck } from "lucide-react"
import { getVenueStatus, formatSmartHours } from "@/lib/venue-hours"
import { getDistrictLabel } from "@/lib/districts"
import { VenueCardLink } from "@/components/spots/venue-card-link"
import { SearchInput } from "@/components/ui/search-input"
import { MobileCategoryPanel } from "@/components/spots/mobile-category-panel"
import { AdvancedFiltersModal } from "@/components/spots/advanced-filters-modal"
import { DistrictFilter } from "@/components/spots/district-filter"
import { SpotsMapLayout } from "@/components/spots/spots-map-layout"
import { SpotsSidebarCategories } from "@/components/spots/spots-sidebar-categories"
import { Suspense } from "react"
import { ScrollableRow } from "@/components/ui/scrollable-row"
import { toggleNeedsVerification } from "@/actions/venues"

// ── Types ──

export interface LeanVenue {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  district: string | null
  hours: string | null
  priceRange: string | null
  imageUrl: string | null
  lat: number | null
  lng: number | null
  isVerified: boolean
  isRecommended: boolean
  needsVerification: boolean
  permanentlyClosed: boolean
  isNew: boolean
  createdAt: string
  category: { name: string; slug: string; color: string; icon: string | null }
  avgRating: number | null
  ratingCount: number
  commentCount: number
  // Extended fields (flattened)
  hasPool?: boolean
  hasDarts?: boolean
  hasConnect4?: boolean
  hasCardGames?: boolean
  hasJenga?: boolean
  hasBeerPong?: boolean
  hasConsoles?: boolean
  hasBoardGames?: boolean
  hasWifi?: boolean
  hasTV?: boolean
  // NiceCity flags
  isKidFriendly?: boolean
  isWheelchairFriendly?: boolean
  isRainyDayFriendly?: boolean
  hasParking?: boolean
  goodForDigitalNomad?: boolean
  petFriendly?: boolean
  goodForFamilies?: boolean
  // Prices
  priceSoftDrink?: number | null
  priceBeerMin?: number | null
  priceAlcoholMin?: number | null
  priceLadyDrink?: number | null
  priceBottleMin?: number | null
  priceTableSmall?: number | null
  priceTableMedium?: number | null
  priceTableLarge?: number | null
  priceBarfineMin?: number | null
  priceShortTimeMin?: number | null
  priceLongTimeMin?: number | null
  priceBJ?: number | null
  priceBoomBoom?: number | null
  priceRoomSmall?: number | null
  priceRoomLarge?: number | null
  priceThaiMassage?: number | null
  priceFootMassage?: number | null
  priceOilMassage?: number | null
  priceCoffeeMin?: number | null
  priceFoodMin?: number | null
  // Freelance area fields
  geometryType?: string | null
  geometryPath?: string | null
  areaRadius?: number | null
  widthHintMeters?: number | null
  zoneType?: string | null
  bestHours?: string | null
  typicalBudgetMin?: number | null
  typicalBudgetMax?: number | null
  crowdStyle?: string | null
  safetyNote?: string | null
  nearbyHotels?: string | null
}

export interface LeanCategory {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
  sortOrder: number | null
}

interface SpotsContentProps {
  venues: LeanVenue[]
  categories: LeanCategory[]
  userId: string | null
  isAdmin: boolean
  favoritedVenueIds: string[]
  pvcPickIds: string[]
  translations: {
    spots: Record<string, string>
    categoryNames: Record<string, string>
  }
}

// ── Constants ──

const POST_ONLY_SLUGS = new Set(["general", "events", "location-bike-car", "administration"])
const FREELANCE_AREA_SLUGS = new Set(["freelance", "ladyboy-freelance", "gay-freelance"])
const HAS_GAMES_SLUGS = new Set([
  "bar", "girly-bar", "ktv", "gentlemans-club", "ladyboy-gentlemens-club", "bj-bar",
  "gay-bar", "ladyboy-bar", "coffee-shop",
])

const MASSAGE_SLUGS = new Set(["massage", "ladyboy-massage", "gay-massage"])
const CLUB_SLUGS = new Set(["club", "gay-club", "ladyboy-club"])
const BJ_SLUGS = new Set(["bj-bar"])
const FREELANCE_SLUGS = new Set(["freelance", "ladyboy-freelance", "gay-freelance"])
const GOGO_SLUGS = new Set(["gogo-bar", "russian-gogo", "gay-gogo", "ladyboy-gogo"])
const GENTLEMANS_SLUGS = new Set(["gentlemans-club", "ladyboy-gentlemens-club"])
const GIRLY_BAR_SLUGS = new Set(["girly-bar", "gay-bar", "ladyboy-bar"])
const NORMAL_BAR_SLUGS = new Set(["bar"])
const KTV_SLUGS = new Set(["ktv"])
const HOTEL_SLUGS = new Set(["short-time-hotel"])
const COFFEE_SLUGS = new Set(["coffee-shop"])

const PRICE_ORDER: Record<string, number> = { "$": 1, "$$": 2, "$$$": 3 }
const PAGE_SIZE = 24
const NEW_VENUE_DAYS = 45

type VenueSortKey = "rating" | "ratingasc" | "reviews" | "reviewsasc" | "name" | "namedesc" | "price" | "pricedesc" | "mentions" | "mentionsasc" | "newest" | "oldest" | "pvcpicks"

function getVisiblePriceFields(cat?: string): string[] {
  if (!cat) return ["coffeeMax", "foodMax", "softMax", "beerMax", "alcoholMax", "bottleMax", "ladyDrinkMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "thaiMassageMax", "footMassageMax", "oilMassageMax"]
  if (MASSAGE_SLUGS.has(cat)) return ["thaiMassageMax", "footMassageMax", "oilMassageMax", "bjMax", "boomBoomMax"]
  if (CLUB_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax"]
  if (BJ_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
  if (FREELANCE_SLUGS.has(cat)) return ["barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
  if (GOGO_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax"]
  if (GENTLEMANS_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
  if (GIRLY_BAR_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
  if (NORMAL_BAR_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "bottleMax"]
  if (KTV_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "barfineMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
  if (HOTEL_SLUGS.has(cat)) return ["shortTimeMax", "longTimeMax"]
  if (COFFEE_SLUGS.has(cat)) return ["coffeeMax", "foodMax", "softMax", "beerMax"]
  return ["coffeeMax", "foodMax", "softMax", "beerMax", "alcoholMax", "bottleMax", "ladyDrinkMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax", "thaiMassageMax", "footMassageMax", "oilMassageMax"]
}

function stripPlusCode(address: string): string {
  return address.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]{2,},?\s*/i, "")
}

// ── Component ──

export function SpotsContent({ venues, categories, userId, isAdmin, favoritedVenueIds, pvcPickIds, translations }: SpotsContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("spots")
  const tc = useTranslations("categoryNames")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [verifyFlags, setVerifyFlags] = useState<Record<string, boolean>>(() => {
    const flags: Record<string, boolean> = {}
    for (const v of venues) if (v.needsVerification) flags[v.id] = true
    return flags
  })

  // Read all filters from searchParams
  const category = searchParams.get("category") || undefined
  const sort = (searchParams.get("sort") || "rating") as VenueSortKey
  const minStars = searchParams.get("minStars") || undefined
  const price = searchParams.get("price") || undefined
  const toVerify = searchParams.get("toVerify") || undefined
  const newOnly = searchParams.get("newOnly") || undefined
  const pool = searchParams.get("pool") || undefined
  const darts = searchParams.get("darts") || undefined
  const connect4 = searchParams.get("connect4") || undefined
  const cards = searchParams.get("cards") || undefined
  const dices = searchParams.get("dices") || undefined
  const beerpong = searchParams.get("beerpong") || undefined
  const consoles = searchParams.get("consoles") || undefined
  const boardgames = searchParams.get("boardgames") || undefined
  const wifi = searchParams.get("wifi") || undefined
  const tv = searchParams.get("tv") || undefined
  // NiceCity profile filters
  const kidFriendly = searchParams.get("kidFriendly") || undefined
  const wheelchairOk = searchParams.get("wheelchairOk") || undefined
  const rainyDayOk = searchParams.get("rainyDayOk") || undefined
  const parking = searchParams.get("parking") || undefined
  const laptopFriendly = searchParams.get("laptopFriendly") || undefined
  const petFriendly = searchParams.get("petFriendly") || undefined
  const familyFriendly = searchParams.get("familyFriendly") || undefined
  const openNow = searchParams.get("openNow") || undefined
  const q = searchParams.get("q") || undefined
  const fireSpot = searchParams.get("fireSpot") || undefined
  const district = searchParams.get("district") || undefined
  const mapView = searchParams.get("map") || undefined

  // Price filters
  const softMax = searchParams.get("softMax") || undefined
  const beerMax = searchParams.get("beerMax") || undefined
  const alcoholMax = searchParams.get("alcoholMax") || undefined
  const ladyDrinkMax = searchParams.get("ladyDrinkMax") || undefined
  const bottleMax = searchParams.get("bottleMax") || undefined
  const tableSmallMax = searchParams.get("tableSmallMax") || undefined
  const tableMediumMax = searchParams.get("tableMediumMax") || undefined
  const tableLargeMax = searchParams.get("tableLargeMax") || undefined
  const barfineMax = searchParams.get("barfineMax") || undefined
  const shortTimeMax = searchParams.get("shortTimeMax") || undefined
  const longTimeMax = searchParams.get("longTimeMax") || undefined
  const bjMax = searchParams.get("bjMax") || undefined
  const boomBoomMax = searchParams.get("boomBoomMax") || undefined
  const smallRoomMax = searchParams.get("smallRoomMax") || undefined
  const roomMax = searchParams.get("roomMax") || undefined
  const thaiMassageMax = searchParams.get("thaiMassageMax") || undefined
  const footMassageMax = searchParams.get("footMassageMax") || undefined
  const oilMassageMax = searchParams.get("oilMassageMax") || undefined
  const coffeeMax = searchParams.get("coffeeMax") || undefined
  const foodMax = searchParams.get("foodMax") || undefined

  const sortKey = sort
  const minStarsNum = minStars ? parseFloat(minStars) : null
  const toVerifyActive = toVerify === "true"
  const newOnlyActive = newOnly === "true"
  const openNowActive = openNow === "true"

  const favSet = useMemo(() => new Set(favoritedVenueIds), [favoritedVenueIds])
  const pvcSet = useMemo(() => new Set(pvcPickIds), [pvcPickIds])

  const sortToggle: { key: string; label: string; icon: string; desc: VenueSortKey; asc: VenueSortKey }[] = [
    { key: "rating",   label: "Rating",   icon: "⭐", desc: "rating",    asc: "ratingasc" },
    { key: "reviews",  label: "Reviews",  icon: "💬", desc: "reviews",   asc: "reviewsasc" },
    { key: "pvcpicks", label: "Squad Picks", icon: "👑", desc: "pvcpicks",  asc: "pvcpicks" },
    { key: "newest",   label: "Newest",   icon: "🆕", desc: "newest",    asc: "oldest" },
    { key: "price",    label: "Price",    icon: "💰", desc: "pricedesc", asc: "price" },
  ]

  // ── Filtering & sorting (all client-side, memoized) ──
  const { sorted, totalBeforeFilter } = useMemo(() => {
    let filtered = venues

    // Category filter
    if (category && category !== "all") {
      filtered = filtered.filter(v => v.category.slug === category)
    }

    const totalBeforeFilter = (!category || !FREELANCE_AREA_SLUGS.has(category))
      ? filtered.filter(v => !FREELANCE_AREA_SLUGS.has(v.category.slug)).length
      : filtered.length

    // Hide freelance from "All" view
    if (!category || !FREELANCE_AREA_SLUGS.has(category)) {
      filtered = filtered.filter(v => !FREELANCE_AREA_SLUGS.has(v.category.slug))
    }

    // Text search - every word must match somewhere (name, description, or category)
    // Strip apostrophes so "bradleys" matches "bradley's" etc.
    // Collapse letter-digit boundaries so "soi6" matches "soi 6" and vice-versa
    // Also match with spaces removed so "cameltoe" matches "camel toe" etc.
    if (q) {
      const strip = (s: string) => s.toLowerCase().replace(/[''\']/g, "")
      const collapse = (s: string) => s.replace(/([a-z])\s+(\d)/gi, "$1$2").replace(/(\d)\s+([a-z])/gi, "$1$2")
      const noSpaces = (s: string) => s.replace(/\s+/g, "")
      const words = strip(q).split(/\s+/).filter(Boolean)
      const queryNoSpaces = noSpaces(strip(q))
      filtered = filtered.filter(v => {
        const haystack = strip(`${v.name} ${v.description ?? ""} ${v.category.name}`)
        const haystackCollapsed = collapse(haystack)
        const haystackNoSpaces = noSpaces(haystack)
        return (words.every(w => haystack.includes(w) || haystackCollapsed.includes(w))
          || haystackNoSpaces.includes(queryNoSpaces))
      })
    }

    if (minStarsNum) filtered = filtered.filter(v => v.avgRating !== null && v.avgRating >= minStarsNum)
    if (price) filtered = filtered.filter(v => v.priceRange === price)
    if (toVerifyActive) filtered = filtered.filter(v => v.needsVerification)
    if (newOnlyActive) filtered = filtered.filter(v => v.isNew)
    if (openNowActive) filtered = filtered.filter(v => getVenueStatus(v.hours) !== "closed")
    if (pool === "true") filtered = filtered.filter(v => v.hasPool)
    if (darts === "true") filtered = filtered.filter(v => v.hasDarts)
    if (connect4 === "true") filtered = filtered.filter(v => v.hasConnect4)
    if (cards === "true") filtered = filtered.filter(v => v.hasCardGames)
    if (dices === "true") filtered = filtered.filter(v => v.hasJenga)
    if (beerpong === "true") filtered = filtered.filter(v => v.hasBeerPong)
    if (consoles === "true") filtered = filtered.filter(v => v.hasConsoles)
    if (boardgames === "true") filtered = filtered.filter(v => v.hasBoardGames)
    if (wifi === "true") filtered = filtered.filter(v => v.hasWifi)
    if (tv === "true") filtered = filtered.filter(v => v.hasTV)
    if (fireSpot === "true") filtered = filtered.filter(v => v.isRecommended)
    // NiceCity profile filters
    if (kidFriendly === "true") filtered = filtered.filter(v => v.isKidFriendly)
    if (familyFriendly === "true") filtered = filtered.filter(v => v.goodForFamilies)
    if (wheelchairOk === "true") filtered = filtered.filter(v => v.isWheelchairFriendly)
    if (rainyDayOk === "true") filtered = filtered.filter(v => v.isRainyDayFriendly)
    if (parking === "true") filtered = filtered.filter(v => v.hasParking)
    if (laptopFriendly === "true") filtered = filtered.filter(v => v.goodForDigitalNomad)
    if (petFriendly === "true") filtered = filtered.filter(v => v.petFriendly)

    // District
    if (district) {
      const districts = new Set(district.split(",").filter(Boolean))
      const includeNA = districts.has("n-a")
      filtered = filtered.filter(v => {
        if (!v.district || v.district === "n-a") return includeNA
        return districts.has(v.district)
      })
    }

    // Price filters
    if (softMax)        filtered = filtered.filter(v => !v.priceSoftDrink || v.priceSoftDrink <= parseInt(softMax))
    if (beerMax)        filtered = filtered.filter(v => !v.priceBeerMin || v.priceBeerMin <= parseInt(beerMax))
    if (alcoholMax)     filtered = filtered.filter(v => !v.priceAlcoholMin || v.priceAlcoholMin <= parseInt(alcoholMax))
    if (ladyDrinkMax)   filtered = filtered.filter(v => !v.priceLadyDrink || v.priceLadyDrink <= parseInt(ladyDrinkMax))
    if (bottleMax)      filtered = filtered.filter(v => !v.priceBottleMin || v.priceBottleMin <= parseInt(bottleMax))
    if (tableSmallMax)  filtered = filtered.filter(v => !v.priceTableSmall || v.priceTableSmall <= parseInt(tableSmallMax))
    if (tableMediumMax) filtered = filtered.filter(v => !v.priceTableMedium || v.priceTableMedium <= parseInt(tableMediumMax))
    if (tableLargeMax)  filtered = filtered.filter(v => !v.priceTableLarge || v.priceTableLarge <= parseInt(tableLargeMax))
    if (barfineMax)     filtered = filtered.filter(v => !v.priceBarfineMin || v.priceBarfineMin <= parseInt(barfineMax))
    if (shortTimeMax)   filtered = filtered.filter(v => !v.priceShortTimeMin || v.priceShortTimeMin <= parseInt(shortTimeMax))
    if (longTimeMax)    filtered = filtered.filter(v => !v.priceLongTimeMin || v.priceLongTimeMin <= parseInt(longTimeMax))
    if (bjMax)          filtered = filtered.filter(v => !v.priceBJ || v.priceBJ <= parseInt(bjMax))
    if (boomBoomMax)    filtered = filtered.filter(v => !v.priceBoomBoom || v.priceBoomBoom <= parseInt(boomBoomMax))
    if (smallRoomMax)   filtered = filtered.filter(v => !v.priceRoomSmall || v.priceRoomSmall <= parseInt(smallRoomMax))
    if (roomMax)        filtered = filtered.filter(v => !v.priceRoomLarge || v.priceRoomLarge <= parseInt(roomMax))
    if (thaiMassageMax) filtered = filtered.filter(v => !v.priceThaiMassage || v.priceThaiMassage <= parseInt(thaiMassageMax))
    if (footMassageMax) filtered = filtered.filter(v => !v.priceFootMassage || v.priceFootMassage <= parseInt(footMassageMax))
    if (oilMassageMax)  filtered = filtered.filter(v => !v.priceOilMassage || v.priceOilMassage <= parseInt(oilMassageMax))
    if (coffeeMax)      filtered = filtered.filter(v => !v.priceCoffeeMin || v.priceCoffeeMin <= parseInt(coffeeMax))
    if (foodMax)        filtered = filtered.filter(v => !v.priceFoodMin || v.priceFoodMin <= parseInt(foodMax))

    // PVC Picks
    if (sortKey === "pvcpicks") filtered = filtered.filter(v => pvcSet.has(v.id))

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "pvcpicks")   return (b.avgRating ?? 0) - (a.avgRating ?? 0)
      if (sortKey === "rating")     return (b.avgRating ?? 0) - (a.avgRating ?? 0)
      if (sortKey === "ratingasc")  return (a.avgRating ?? 0) - (b.avgRating ?? 0)
      if (sortKey === "reviews")    return b.ratingCount - a.ratingCount
      if (sortKey === "reviewsasc") return a.ratingCount - b.ratingCount
      if (sortKey === "newest")     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortKey === "oldest")     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortKey === "name")       return a.name.localeCompare(b.name)
      if (sortKey === "namedesc")   return b.name.localeCompare(a.name)
      if (sortKey === "price")      return (PRICE_ORDER[a.priceRange ?? ""] ?? 0) - (PRICE_ORDER[b.priceRange ?? ""] ?? 0)
      if (sortKey === "pricedesc")  return (PRICE_ORDER[b.priceRange ?? ""] ?? 0) - (PRICE_ORDER[a.priceRange ?? ""] ?? 0)
      return 0
    })

    return { sorted, totalBeforeFilter }
  }, [venues, category, q, minStarsNum, price, toVerifyActive, newOnlyActive, openNowActive,
      pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv, fireSpot,
      kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly,
      district, softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax,
      tableSmallMax, tableMediumMax, tableLargeMax,
      barfineMax, shortTimeMax, longTimeMax, bjMax, boomBoomMax,
      smallRoomMax, roomMax, thaiMassageMax, footMassageMax, oilMassageMax,
      coffeeMax, foodMax, sortKey, pvcSet])

  // Reset pagination when filters change
  const filterKey = `${category}-${q}-${sort}-${minStars}-${price}-${district}-${openNow}`
  useMemo(() => { setVisibleCount(PAGE_SIZE) }, [filterKey])

  // URL helpers
  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      category, sort: sort === "rating" ? undefined : sort, minStars, price, toVerify, newOnly,
      pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv, openNow, q, fireSpot,
      kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly,
      district, map: mapView,
      softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax,
      tableSmallMax, tableMediumMax, tableLargeMax,
      barfineMax, shortTimeMax, longTimeMax,
      bjMax, boomBoomMax, smallRoomMax, roomMax, thaiMassageMax, footMassageMax, oilMassageMax,
      coffeeMax, foodMax,
      ...overrides,
    }
    for (const [k, v] of Object.entries(base)) { if (v) p.set(k, v) }
    const s = p.toString()
    return s ? `/?${s}` : "/"
  }

  function toggleSortUrl(toggle: typeof sortToggle[number]) {
    if (sortKey === toggle.desc) return filterUrl({ sort: toggle.asc })
    if (sortKey === toggle.asc) return filterUrl({ sort: toggle.desc })
    return filterUrl({ sort: toggle.desc })
  }

  function isSortActive(toggle: typeof sortToggle[number]) {
    return sortKey === toggle.desc || sortKey === toggle.asc
  }

  function getSortArrow(toggle: typeof sortToggle[number]) {
    if (toggle.key === "price") {
      if (sortKey === "pricedesc") return " $$+"
      if (sortKey === "price") return " $-"
      return ""
    }
    if (sortKey === toggle.desc) return " ↓"
    if (sortKey === toggle.asc) return " ↑"
    return ""
  }

  const hasActiveFilters = !!(minStars || price || toVerify || pool || darts || connect4 || cards || dices || beerpong || consoles || boardgames || wifi || tv || openNow || district || softMax || beerMax || alcoholMax || ladyDrinkMax || bottleMax || tableSmallMax || tableMediumMax || tableLargeMax || barfineMax || shortTimeMax || longTimeMax || bjMax || boomBoomMax || smallRoomMax || roomMax || thaiMassageMax || footMassageMax || oilMassageMax || coffeeMax || foodMax || kidFriendly || wheelchairOk || rainyDayOk || parking || laptopFriendly || petFriendly || familyFriendly)
  const showMap = mapView !== "false"
  const showGames = !category || HAS_GAMES_SLUGS.has(category)
  const visiblePriceFields = getVisiblePriceFields(category)

  const searchParamsStr = useMemo(() => {
    const p = new URLSearchParams()
    searchParams.forEach((v, k) => p.set(k, v))
    return p.toString()
  }, [searchParams])

  // Paginated venues
  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  // ── Map data ──
  const mapVenues = useMemo(() =>
    sorted.filter(v => {
      if (v.lat && v.lng) return true
      // Include geometry-only venues (freelance zones with polylines/polygons)
      if (v.geometryPath) return true
      return false
    }).map(v => {
      let lat = v.lat
      let lng = v.lng
      // Derive center from geometry path for venues without lat/lng
      if (!lat && !lng && v.geometryPath) {
        try {
          const pts: [number, number][] = JSON.parse(v.geometryPath)
          if (pts.length > 0) {
            const mid = pts[Math.floor(pts.length / 2)]
            lat = mid[0]; lng = mid[1]
          }
        } catch {}
      }
      return {
        id: v.id, slug: v.slug, name: v.name, imageUrl: v.imageUrl,
        categoryName: v.category.name, categorySlug: v.category.slug,
        categoryIcon: v.category.icon, categoryColor: v.category.color,
        avgRating: v.avgRating, ratingCount: v.ratingCount,
        priceRange: v.priceRange, district: v.district,
        areaRadius: v.areaRadius ?? null,
        geometryType: v.geometryType ?? null,
        geometryPath: v.geometryPath ?? null,
        widthHintMeters: v.widthHintMeters ?? null,
        lat, lng,
      }
    }),
  [sorted])

  const activeCat = categories.find(c => c.slug === category)

  // ── Render ──
  const gridContent = sorted.length === 0 ? (
    <div className="text-center py-16 text-muted-foreground">
      <p>{t("noSpotsMatch")}</p>
      <Link href="/" className="text-primary text-sm hover:underline mt-1 block">{t("clearAllFilters")}</Link>
    </div>
  ) : (
    <>
      <div className={`grid gap-3 p-4 -m-4 ${showMap ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {visible.map((venue, idx) => {
          const rank = idx
          const isFreelanceArea = FREELANCE_AREA_SLUGS.has(venue.category.slug)
          const venueStatus = getVenueStatus(venue.hours)

          if (isFreelanceArea) {
            return <FreelanceAreaCard key={venue.id} venue={venue} rank={rank} tc={tc} t={t} locale={locale} />
          }

          const amenities: string[] = []
          if (venue.hasPool) amenities.push(`🎱 ${t("pool")}`)
          if (venue.hasDarts) amenities.push(`🎯 ${t("darts")}`)
          if (venue.hasWifi) amenities.push(`📶 ${t("wifi")}`)
          if (venue.hasTV) amenities.push(`📺 ${t("tv")}`)
          if (venue.hasBeerPong) amenities.push(`🏓 ${t("beerPong")}`)
          if (venue.hasConnect4) amenities.push(`🔴 ${t("connect4")}`)
          if (venue.hasConsoles) amenities.push(`🎮 ${t("consoles")}`)
          if (venue.hasCardGames) amenities.push(`🃏 ${t("cards")}`)
          if (venue.hasBoardGames) amenities.push(`♟️ ${t("boardGames")}`)
          if (venue.hasJenga) amenities.push(`🎲 ${t("dices")}`)
          const visibleAmenities = amenities.slice(0, 5)
          const extraCount = amenities.length - visibleAmenities.length

          return (
            <VenueCardLink key={venue.id} venueId={venue.id} href={`/places/${venue.slug}`}>
              {/* Image zone */}
              <div className="aspect-[2/1] md:aspect-[5/2] bg-gradient-to-br from-[rgba(36,28,20,0.9)] to-[rgba(26,21,16,0.7)] relative overflow-hidden">
                {venue.imageUrl ? (
                  <Image
                    src={venue.imageUrl}
                    alt={venue.name}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl opacity-20">{venue.category.icon}</span>
                  </div>
                )}
                {venue.permanentlyClosed && (
                  <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                    <span className="text-red-400 font-bold text-sm bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-red-500/30">
                      Permanently Closed
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1510] via-[rgba(26,21,16,0.2)] to-transparent" />

                {/* Top left: category + hot badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                  <Link href={`/?category=${venue.category.slug}`} className="px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm hover:brightness-125 transition-all relative z-10"
                    style={{ backgroundColor: venue.category.color + "30", color: venue.category.color, border: `1px solid ${venue.category.color}40` }}>
                    {tc.has(venue.category.slug) ? tc(venue.category.slug) : venue.category.name}
                  </Link>
                  {venue.isRecommended && (
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 backdrop-blur-sm text-orange-400 flex items-center gap-0.5 border border-orange-500/40">
                      <Flame className="h-3 w-3 fill-orange-400" /> Hot
                    </span>
                  )}
                </div>

                {/* Top right: admin verify + rank + favorite */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const current = !!verifyFlags[venue.id]
                        setVerifyFlags(prev => {
                          const next = { ...prev }
                          if (current) delete next[venue.id]; else next[venue.id] = true
                          return next
                        })
                        toggleNeedsVerification(venue.id)
                      }}
                      className={`flex items-center justify-center h-6 w-6 rounded-full backdrop-blur-sm transition-all ${
                        verifyFlags[venue.id]
                          ? "bg-yellow-500/30 border border-yellow-400/60 text-yellow-300"
                          : "bg-black/40 border border-white/20 text-white/50 hover:text-white/80"
                      }`}
                      title={verifyFlags[venue.id] ? "Flagged - a verifier" : "Marquer a verifier"}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {favSet.has(venue.id) && (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-black/50 backdrop-blur-sm border border-[rgba(224,120,80,0.40)]">
                      <Heart className="h-3.5 w-3.5 fill-[#e07850] text-[#e07850]" />
                    </span>
                  )}
                  {rank < 5 && venue.avgRating && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-black/60 backdrop-blur-sm border border-[rgba(61,184,160,0.20)]"
                      style={{ color: "#3db8a0", textShadow: "0 0 8px rgba(61,184,160,0.60)" }}>
                      #{rank + 1}
                    </span>
                  )}
                </div>

                {/* Bottom left: open/closed */}
                <div className="absolute bottom-2 left-2 z-10">
                  {venueStatus === "open" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/20 backdrop-blur-sm text-green-400 border border-green-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {t("openStatus")}
                    </span>
                  )}
                  {venueStatus === "closing-soon" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-500/20 backdrop-blur-sm text-yellow-400 border border-yellow-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" /> {t("closingSoon")}
                    </span>
                  )}
                  {venueStatus === "closed" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 backdrop-blur-sm text-red-400/80 border border-red-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500/60" /> {t("closedStatus")}
                    </span>
                  )}
                </div>

                {/* Bottom right: price */}
                {venue.priceRange && (
                  <span className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(61,184,160,0.12)] backdrop-blur-sm text-[#3db8a0] border border-[rgba(61,184,160,0.30)]"
                    style={{ textShadow: "0 0 6px rgba(61,184,160,0.40)" }}>
                    {venue.priceRange}
                  </span>
                )}
              </div>

              {/* Content zone */}
              <div className="px-2.5 pt-3 pb-2 space-y-1 md:px-2 md:pt-2.5 md:pb-1.5 md:space-y-0.5 relative z-10 -mt-2 bg-gradient-to-b from-[rgba(26,21,16,0.95)] to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-sm md:text-[12px] leading-snug group-hover:text-[#e8a840] transition-colors line-clamp-1">{venue.name}</h2>
                  <div className="shrink-0 text-right space-y-0.5">
                    {venue.avgRating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 md:h-3.5 md:w-3.5 fill-[#ff9f43] text-[#ff9f43]" />
                        <span className="text-[15px] md:text-[12px] font-bold text-[#ff9f43]">{venue.avgRating}</span>
                        <span className="text-xs text-muted-foreground">({venue.ratingCount})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("notYetRated")}</span>
                    )}
                    <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{venue.commentCount}</span>
                    </div>
                  </div>
                </div>

                {(venue.district || venue.address) && (
                  <div className="flex items-center gap-1.5 text-[13px] md:text-[11px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 md:h-3 md:w-3 shrink-0 text-[rgba(232,168,64,0.60)]" />
                    <span className="truncate">{(venue.district && getDistrictLabel(venue.district)) || venue.district || (venue.address && stripPlusCode(venue.address))}</span>
                  </div>
                )}

                {venue.hours && (
                  <div className="flex items-center gap-1.5 text-[13px] md:text-[11px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 md:h-3 md:w-3 shrink-0 text-[rgba(232,168,64,0.60)]" />
                    <span className="truncate">{(() => {
                      const lines = formatSmartHours(venue.hours, locale)
                      if (lines.length > 0) return lines[0]
                      if (venue.hours.includes(";") && venue.hours.split(";").every(p => /open\s+24\s+hours/i.test(p))) return "Open 24/7"
                      return venue.hours.split(";")[0]?.trim() || venue.hours
                    })()}</span>
                  </div>
                )}

                {visibleAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-1 pt-0.5">
                    {visibleAmenities.map((a, i) => (
                      <span key={i} className="text-[11px] md:text-[10px] px-2 md:px-1.5 py-0.5 rounded-md bg-[rgba(75,35,120,0.24)] text-muted-foreground">
                        {a}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="text-[11px] md:text-[10px] px-2 md:px-1.5 py-0.5 rounded-md bg-[rgba(75,35,120,0.24)] text-muted-foreground font-medium">
                        +{extraCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </VenueCardLink>
          )
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_18px_rgba(232,168,64,0.3)] hover:shadow-[0_0_24px_rgba(232,168,64,0.5)] transition-all"
          >
            {t("loadMore") || "Load more"} ({sorted.length - visibleCount} {t("remaining") || "remaining"})
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      {/* Left sidebar: categories */}
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(4.25rem+1rem)] max-h-[calc(100vh-5.75rem)] overflow-y-auto overscroll-contain scrollbar-hide">
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2.5 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#e8a840] animate-pulse" />
              <span className="gradient-text">{t("categories")}</span>
            </p>
            <SpotsSidebarCategories
              categories={categories}
              currentCategory={category}
              searchParamsStr={searchParamsStr}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="space-y-3 min-w-0">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex items-center gap-7 md:gap-3 -my-1 md:my-0 md:block">
            <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] leading-none">
              <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("title")}</span>
            </h1>
            <div className="text-center md:text-left md:mt-1 space-y-0.5 md:space-y-0 translate-y-[4px] md:translate-y-0">
              {activeCat && (
                <p className="text-[#e8a840] font-semibold text-sm whitespace-nowrap leading-tight">{activeCat.icon} {tc.has(activeCat.slug) ? tc(activeCat.slug) : activeCat.name}</p>
              )}
              <p className="text-muted-foreground text-xs whitespace-nowrap leading-tight">
                <span className="text-foreground font-semibold">{sorted.length}</span>/<span className="text-foreground font-semibold">{totalBeforeFilter}</span> {t("spotsFound")}
              </p>
            </div>
          </div>
          <div className="hidden md:flex flex-1 items-center pt-0.5">
            <div className="w-full max-w-[400px] ml-[200px]">
              <SearchInput
                placeholder={t("searchSpots")}
                paramName="q"
                defaultValue={q ?? ""}
                className="w-full"
                historyKey="pvc_search_spots"
              />
            </div>
          </div>
        </div>

        {/* Mobile: sticky search bar only */}
        <div className="md:hidden sticky top-[3.5rem] z-40 -mx-4 px-4 py-2.5 border-b border-[rgba(232,168,64,0.2)] shadow-[0_4px_12px_rgba(0,0,0,0.3)] sticky-bar" style={{ background: "#1a1510", backdropFilter: "blur(16px)" }}>
          <SearchInput
            placeholder={t("searchSpots")}
            paramName="q"
            defaultValue={q ?? ""}
            historyKey="pvc_search_spots"
          />
        </div>
        {/* Mobile: filter rows (scroll with page, NOT sticky) */}
        <div className="md:hidden -mx-4">
          <ScrollableRow className="px-4 pt-1 pb-1">
            <Suspense fallback={null}>
              <MobileCategoryPanel categories={JSON.parse(JSON.stringify(categories))} compact />
            </Suspense>
            <AdvancedFiltersModal
              currentValues={{
                minStars, price,
                pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv,
                kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly,
                softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax,
                tableSmallMax, tableMediumMax, tableLargeMax,
                barfineMax, shortTimeMax, longTimeMax,
                bjMax, boomBoomMax, smallRoomMax, roomMax,
                thaiMassageMax, footMassageMax, oilMassageMax,
                coffeeMax, foodMax,
              }}
              showGames={showGames}
              visiblePriceFields={visiblePriceFields}
              activeCount={[minStars, price, pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv, kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly, softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax, tableSmallMax, tableMediumMax, tableLargeMax, barfineMax, shortTimeMax, longTimeMax, bjMax, boomBoomMax, smallRoomMax, roomMax, thaiMassageMax, footMassageMax, oilMassageMax, coffeeMax, foodMax].filter(Boolean).length}
            />
            <Link href={filterUrl({ openNow: openNowActive ? undefined : "true" })}
              className={`shrink-0 category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${openNowActive ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white" : "glass-card text-muted-foreground"}`}>
              Open Now
            </Link>
            {isAdmin && (
              <Link href={filterUrl({ toVerify: toVerifyActive ? undefined : "true" })}
                className={`shrink-0 category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${toVerifyActive ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "glass-card text-muted-foreground"}`}>
                <ClipboardCheck className="h-3 w-3" /> A Verifier
              </Link>
            )}
          </ScrollableRow>
          <ScrollableRow className="px-4 pb-1 py-0.5">
            {sortToggle.map(toggle => (
              <Link key={toggle.key} href={toggleSortUrl(toggle)}
                className={`shrink-0 category-pill px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${isSortActive(toggle) ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white" : "glass-card text-muted-foreground"}`}>
                <span className="text-[10px]">{toggle.icon}</span> {toggle.label}{getSortArrow(toggle)}
              </Link>
            ))}
            {hasActiveFilters && (
              <Link href={filterUrl({ minStars: undefined, price: undefined, toVerify: undefined, newOnly: undefined, pool: undefined, darts: undefined, connect4: undefined, cards: undefined, dices: undefined, beerpong: undefined, consoles: undefined, boardgames: undefined, wifi: undefined, tv: undefined, openNow: undefined, fireSpot: undefined, district: undefined, softMax: undefined, beerMax: undefined, alcoholMax: undefined, ladyDrinkMax: undefined, bottleMax: undefined, tableSmallMax: undefined, tableMediumMax: undefined, tableLargeMax: undefined, barfineMax: undefined, shortTimeMax: undefined, longTimeMax: undefined, bjMax: undefined, boomBoomMax: undefined, smallRoomMax: undefined, roomMax: undefined, thaiMassageMax: undefined, footMassageMax: undefined, oilMassageMax: undefined, coffeeMax: undefined, foodMax: undefined })}
                  className="shrink-0 category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border border-red-500/50 bg-red-500/10 text-red-400 whitespace-nowrap">
                  <X className="h-3 w-3" /> Clear
              </Link>
            )}
          </ScrollableRow>
          <ScrollableRow className="px-4 pb-1 py-0.5">
            <Suspense>
              <DistrictFilter />
            </Suspense>
          </ScrollableRow>
        </div>

        {/* Desktop filter bar */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          {sortToggle.map(toggle => (
            <Link key={toggle.key} href={toggleSortUrl(toggle)}
              className={`category-pill px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${isSortActive(toggle) ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_12px_rgba(232,168,64,0.3)]" : "glass-card text-muted-foreground hover:border-[rgba(232,168,64,0.4)] hover:text-[#3db8a0]"}`}>
              <span className="text-[10px]">{toggle.icon}</span> {toggle.label}{getSortArrow(toggle)}
            </Link>
          ))}
          <div className="h-5 w-px bg-[rgba(232,168,64,0.20)] mx-0.5 hidden sm:block" />
          <Link href={filterUrl({ openNow: openNowActive ? undefined : "true" })}
            className={`category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${openNowActive ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_12px_rgba(232,168,64,0.3)]" : "glass-card text-muted-foreground hover:border-[rgba(232,168,64,0.4)] hover:text-[#3db8a0]"}`}>
            {t("openNow")}
          </Link>
          <Link href={filterUrl({ map: showMap ? "false" : undefined })}
            className={`category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${showMap ? "bg-gradient-to-r from-[#3db8a0] to-[#e07850] text-white shadow-[0_0_12px_rgba(61,184,160,0.3)]" : "glass-card text-muted-foreground hover:border-[rgba(61,184,160,0.4)] hover:text-[#3db8a0]"}`}>
            Map
          </Link>
          {isAdmin && (
            <Link href={filterUrl({ toVerify: toVerifyActive ? undefined : "true" })}
              className={`category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${toVerifyActive ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "glass-card text-muted-foreground hover:border-amber-500/40 hover:text-amber-400"}`}>
              <ClipboardCheck className="h-3 w-3" /> A Verifier
            </Link>
          )}
          <div className="hidden lg:block">
            <AdvancedFiltersModal
              currentValues={{
                minStars, price,
                pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv,
                kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly,
                softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax,
                tableSmallMax, tableMediumMax, tableLargeMax,
                barfineMax, shortTimeMax, longTimeMax,
                bjMax, boomBoomMax, smallRoomMax, roomMax,
                thaiMassageMax, footMassageMax, oilMassageMax,
                coffeeMax, foodMax,
              }}
              showGames={showGames}
              visiblePriceFields={visiblePriceFields}
              activeCount={[minStars, price, pool, darts, connect4, cards, dices, beerpong, consoles, boardgames, wifi, tv, kidFriendly, wheelchairOk, rainyDayOk, parking, laptopFriendly, petFriendly, familyFriendly, softMax, beerMax, alcoholMax, ladyDrinkMax, bottleMax, tableSmallMax, tableMediumMax, tableLargeMax, barfineMax, shortTimeMax, longTimeMax, bjMax, boomBoomMax, smallRoomMax, roomMax, thaiMassageMax, footMassageMax, oilMassageMax, coffeeMax, foodMax].filter(Boolean).length}
            />
          </div>
          {hasActiveFilters && (
            <Link href={filterUrl({ minStars: undefined, price: undefined, toVerify: undefined, newOnly: undefined, pool: undefined, darts: undefined, connect4: undefined, cards: undefined, dices: undefined, beerpong: undefined, consoles: undefined, boardgames: undefined, wifi: undefined, tv: undefined, openNow: undefined, fireSpot: undefined, district: undefined, kidFriendly: undefined, wheelchairOk: undefined, rainyDayOk: undefined, parking: undefined, laptopFriendly: undefined, petFriendly: undefined, familyFriendly: undefined, softMax: undefined, beerMax: undefined, alcoholMax: undefined, ladyDrinkMax: undefined, bottleMax: undefined, tableSmallMax: undefined, tableMediumMax: undefined, tableLargeMax: undefined, barfineMax: undefined, shortTimeMax: undefined, longTimeMax: undefined, bjMax: undefined, boomBoomMax: undefined, smallRoomMax: undefined, roomMax: undefined, thaiMassageMax: undefined, footMassageMax: undefined, oilMassageMax: undefined, coffeeMax: undefined, foodMax: undefined })}
                className="category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/70 transition-all">
                <X className="h-3 w-3" /> {t("clear")}
            </Link>
          )}
        </div>

        {/* Desktop district filter */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          <Suspense>
            <DistrictFilter />
          </Suspense>
        </div>

        {/* Grid / Map */}
        {showMap ? (
          <SpotsMapLayout venues={mapVenues} locale={locale}>{gridContent}</SpotsMapLayout>
        ) : gridContent}
      </div>
    </div>
  )
}

// ── Freelance area card (extracted for readability) ──

function FreelanceAreaCard({ venue, rank, tc, t, locale }: {
  venue: LeanVenue; rank: number;
  tc: ReturnType<typeof useTranslations>; t: ReturnType<typeof useTranslations>; locale: string
}) {
  const activityLevel = (() => {
    if (!venue.hours) return "unknown"
    const status = getVenueStatus(venue.hours)
    if (status === "closed") return "quiet"
    if (status === "closing-soon") return "winding-down"
    try {
      const h = JSON.parse(venue.hours)
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
      const now = new Date()
      const dayKey = days[now.getUTCDay() + 7]
      const today = h[dayKey] || h.Mon
      if (!today || today.closed) return "quiet"
      const hour = (now.getUTCHours() + 7) % 24
      if (hour >= 22 || hour <= 1) return "peak"
      const openH = parseInt(today.open?.split(":")[0] || "20")
      if (hour >= openH && hour < openH + 2) return "busy"
      return "busy"
    } catch { return "busy" }
  })()

  const budgetMin = venue.typicalBudgetMin
  const budgetMax = venue.typicalBudgetMax
  const budgetStr = budgetMin && budgetMax
    ? `${(budgetMin / 1000).toFixed(1)}k–${(budgetMax / 1000).toFixed(1)}k`
    : budgetMin ? `${(budgetMin / 1000).toFixed(1)}k+` : null

  const activityColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    "quiet": { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-500", label: "Quiet now" },
    "winding-down": { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-500", label: "Winding down" },
    "busy": { bg: "bg-green-500/15", text: "text-green-400", dot: "bg-green-500", label: "Busy now" },
    "peak": { bg: "bg-orange-500/15", text: "text-orange-300", dot: "bg-orange-400 animate-pulse", label: "Peak hours" },
    "unknown": { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-500", label: "-" },
  }
  const activity = activityColors[activityLevel] || activityColors.unknown

  const zoneTypeLabels: Record<string, { icon: string; label: string }> = {
    "street-strip": { icon: "️", label: "Street Strip" },
    "corner-spot": { icon: "", label: "Corner Spot" },
    "zone": { icon: "️", label: "Zone" },
  }
  const zt = zoneTypeLabels[venue.zoneType ?? ""] || null

  return (
    <VenueCardLink key={venue.id} venueId={venue.id} href={`/places/${venue.slug}`}>
      <div className="p-4 md:p-3 space-y-3 md:space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: venue.category.color + "25", color: venue.category.color, border: `1px solid ${venue.category.color}35` }}>
              {tc.has(venue.category.slug) ? tc(venue.category.slug) : venue.category.name}
            </span>
            {zt && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-muted-foreground border border-white/10">
                {zt.icon} {zt.label}
              </span>
            )}
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${activity.bg} ${activity.text} border border-current/20`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activity.dot}`} />
            {activity.label}
          </span>
        </div>

        <h2 className="font-bold text-base md:text-sm leading-tight group-hover:text-[#e8a840] transition-colors">{venue.name}</h2>

        <div className="flex flex-wrap gap-1.5">
          {venue.bestHours ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[rgba(224,120,80,0.15)] text-purple-300 border border-purple-500/20">
              <Clock className="h-3 w-3" /> {venue.bestHours}
            </span>
          ) : venue.hours && (() => {
            const lines = formatSmartHours(venue.hours, locale)
            return lines.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[rgba(224,120,80,0.15)] text-purple-300 border border-purple-500/20">
                <Clock className="h-3 w-3" /> {lines[0]}
              </span>
            ) : null
          })()}
          {budgetStr && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[rgba(61,184,160,0.10)] text-[#3db8a0] border border-[rgba(61,184,160,0.20)]">
              ฿{budgetStr}
            </span>
          )}
          {venue.district && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[rgba(232,168,64,0.10)] text-[#e8a840] border border-[rgba(232,168,64,0.20)]">
              <MapPin className="h-3 w-3" /> {getDistrictLabel(venue.district) || venue.district}
            </span>
          )}
        </div>

        {(venue.crowdStyle || venue.description) && (
          <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
            {venue.crowdStyle || venue.description}
          </p>
        )}

        {venue.safetyNote && (
          <div className="flex items-start gap-1.5 text-[11px] text-yellow-400/80 bg-yellow-500/8 rounded-md px-2 py-1.5 border border-yellow-500/15">
            <span className="shrink-0">️</span>
            <span className="line-clamp-2">{venue.safetyNote}</span>
          </div>
        )}

        {venue.nearbyHotels && (() => {
          try {
            const hotels = JSON.parse(venue.nearbyHotels) as string[]
            if (!hotels.length) return null
            return (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="shrink-0">🏩</span>
                <span className="truncate">{hotels.slice(0, 3).join(", ")}</span>
              </div>
            )
          } catch { return null }
        })()}

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          {venue.avgRating ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#ff9f43] text-[#ff9f43]" />
              <span className="text-sm font-bold text-[#ff9f43]">{venue.avgRating}</span>
              <span className="text-xs text-muted-foreground">({venue.ratingCount})</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{t("notYetRated")}</span>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{venue.commentCount}</span>
          </div>
        </div>
      </div>
    </VenueCardLink>
  )
}
