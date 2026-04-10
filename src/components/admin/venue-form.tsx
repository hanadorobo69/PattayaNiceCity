"use client"

import { useState, useTransition, lazy, Suspense } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { DISTRICTS } from "@/lib/districts"
import { createVenueAdmin, updateVenueAdmin } from "@/actions/venues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { MediaUploader, type MediaItem } from "@/components/ui/media-uploader"
import { AddressAutocomplete } from "@/components/admin/address-autocomplete"
import { Loader2, MapPin, Search, ExternalLink, Clock, DollarSign, Gamepad2, Star, Heart, Download } from "lucide-react"
import { MentionInput } from "@/components/ui/mention-input"
import type { Category } from "@prisma/client"

const DraggableMap = lazy(() => import("@/components/admin/draggable-map").then(m => ({ default: m.DraggableMap })))

// Community-only categories - excluded from spot creation form
const COMMUNITY_SLUGS = new Set(["general", "events", "location-bike-car", "administration"])

// Category groups - mirrors the filter logic on the homepage
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
const HAS_GAMES_SLUGS = new Set([
  "bar", "girly-bar", "ktv", "gentlemans-club", "ladyboy-gentlemens-club", "bj-bar",
  "gay-bar", "ladyboy-bar", "coffee-shop",
])

type PriceGroup = "drinks" | "ladyDrink" | "bottle" | "clubTables" | "barfine" | "shortLong" | "room" | "bj" | "boomBoom" | "massage" | "coffee"

function getVisibleGroups(slug?: string): Set<PriceGroup> {
  if (!slug) return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong", "room", "bj", "boomBoom", "massage", "coffee"])
  if (MASSAGE_SLUGS.has(slug)) return new Set(["massage", "bj", "boomBoom"])
  if (CLUB_SLUGS.has(slug)) return new Set(["drinks", "bottle", "clubTables"])
  if (BJ_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (FREELANCE_SLUGS.has(slug)) return new Set(["barfine", "shortLong", "room", "bj", "boomBoom"])
  if (GOGO_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong"])
  if (GENTLEMANS_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (GIRLY_BAR_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (NORMAL_BAR_SLUGS.has(slug)) return new Set(["drinks", "bottle"])
  if (KTV_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "barfine", "room", "bj", "boomBoom"])
  if (HOTEL_SLUGS.has(slug)) return new Set(["shortLong"])
  if (COFFEE_SLUGS.has(slug)) return new Set(["coffee", "drinks"])
  return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong", "room", "bj", "boomBoom", "massage", "coffee"])
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
type Day = typeof DAYS[number]
type DaySchedule = { open: string; close: string; closed: boolean }
type WeekSchedule = Record<Day, DaySchedule>

const DEFAULT_SCHEDULE: WeekSchedule = {
  Mon: { open: "19:00", close: "03:00", closed: false },
  Tue: { open: "19:00", close: "03:00", closed: false },
  Wed: { open: "19:00", close: "03:00", closed: false },
  Thu: { open: "19:00", close: "03:00", closed: false },
  Fri: { open: "19:00", close: "04:00", closed: false },
  Sat: { open: "19:00", close: "04:00", closed: false },
  Sun: { open: "19:00", close: "03:00", closed: false },
}

function parseHours(raw?: string | null): WeekSchedule {
  if (!raw) return DEFAULT_SCHEDULE
  try {
    const parsed = JSON.parse(raw)
    if (parsed.Mon !== undefined) return { ...DEFAULT_SCHEDULE, ...parsed }
  } catch {}
  return DEFAULT_SCHEDULE
}

function serializeHours(schedule: WeekSchedule): string {
  return JSON.stringify(schedule)
}

function OpeningHoursEditor({ value, onChange, t }: { value: WeekSchedule; onChange: (v: WeekSchedule) => void; t: ReturnType<typeof useTranslations<"venueForm">> }) {
  function setDay(day: Day, field: keyof DaySchedule, val: string | boolean) {
    onChange({ ...value, [day]: { ...value[day], [field]: val } })
  }
  return (
    <div className="space-y-2">
      {DAYS.map(day => (
        <div key={day} className="grid grid-cols-[2.5rem_1fr_1fr_auto] gap-2 items-center text-sm">
          <span className="font-medium text-muted-foreground text-xs">{t(`day${day}` as any)}</span>
          <Input type="time" value={value[day].open} onChange={e => setDay(day, "open", e.target.value)} disabled={value[day].closed} className="h-8 text-xs" />
          <Input type="time" value={value[day].close} onChange={e => setDay(day, "close", e.target.value)} disabled={value[day].closed} className="h-8 text-xs" />
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={value[day].closed} onChange={e => setDay(day, "closed", e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">{t("closed")}</span>
          </label>
        </div>
      ))}
      <div className="flex gap-2 text-xs text-muted-foreground pt-1">
        <span className="w-10" />
        <span className="text-center flex-1">{t("open")}</span>
        <span className="text-center flex-1">{t("close")}</span>
        <span className="w-16" />
      </div>
    </div>
  )
}

function PriceInput({ id, name, label, defaultValue, placeholder }: { id: string; name: string; label: string; defaultValue?: number | null; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
        <Input id={id} name={name} type="number" defaultValue={defaultValue ?? ""} placeholder={placeholder ?? ""} className="h-8 text-xs pl-7" />
      </div>
    </div>
  )
}

function SectionSeparator({ label, color }: { label: string; color: string }) {
  return (
    <div className="col-span-full flex items-center gap-2 pt-2 pb-0.5">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}aa` }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }} />
    </div>
  )
}

interface VenueFormProps {
  categories: Category[]
  initialData?: Record<string, any>
}

export function VenueForm({ categories, initialData }: VenueFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations("venueForm")
  const tp = useTranslations("priceFilters")
  const tc = useTranslations("common")
  const tcat = useTranslations("categoryNames")
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "")
  const [priceRange, setPriceRange] = useState(initialData?.priceRange ?? "")
  const [lat, setLat] = useState(initialData?.lat?.toString() ?? "")
  const [lng, setLng] = useState(initialData?.lng?.toString() ?? "")
  const [geocoding, setGeocoding] = useState(false)
  const [address, setAddress] = useState(initialData?.address ?? "")
  const [district, setDistrict] = useState(initialData?.district ?? "")
  const [schedule, setSchedule] = useState<WeekSchedule>(parseHours(initialData?.hours))
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [placesPhotos, setPlacesPhotos] = useState<string[]>([])
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [fetchingPhotos, setFetchingPhotos] = useState(false)
  const [website, setWebsite] = useState(initialData?.website ?? "")
  const [phone, setPhone] = useState(() => {
    const raw = initialData?.phone ?? ""
    return raw.replace(/^\+?66\s?/, "")
  })
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    const items: MediaItem[] = []
    if (initialData?.imageUrl) items.push({ url: initialData.imageUrl, type: "IMAGE" as const })
    if (initialData?.media?.length) {
      for (const m of initialData.media) {
        if (m.url !== initialData.imageUrl) {
          items.push({ url: m.url, type: (m.type as "IMAGE" | "VIDEO") ?? "IMAGE" })
        }
      }
    }
    return items
  })

  async function geocodeAddress() {
    if (!address) return
    setGeocoding(true)
    try {
      const query = encodeURIComponent(`${address}, Pattaya, Thailand`)
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`)
      const data = await res.json()
      if (data.results?.[0]) {
        const loc = data.results[0].geometry.location
        setLat(loc.lat.toFixed(6))
        setLng(loc.lng.toFixed(6))
        toast({ title: t("locationFound"), description: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` })
      } else {
        toast({ title: t("notFound"), description: t("tryMoreSpecific"), variant: "destructive" })
      }
    } catch {
      toast({ title: t("geocodingFailed"), variant: "destructive" })
    } finally { setGeocoding(false) }
  }

  /** Try to resolve a Google placeId using venue name then address as fallback */
  async function resolveGooglePlaceId(): Promise<string | null> {
    if (placeId) return placeId
    // Try venue name + Pattaya first (best for Google Autocomplete)
    const nameInput = document.getElementById("name") as HTMLInputElement | null
    const venueName = nameInput?.value?.trim()
    const queries = [
      venueName ? `${venueName} Pattaya` : null,
      venueName && address ? `${venueName} ${address}` : null,
      address || null,
    ].filter(Boolean) as string[]

    for (const query of queries) {
      try {
        const acRes = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(query)}`)
        const acData = await acRes.json()
        const pid = acData.predictions?.[0]?.place_id
        if (pid) {
          setPlaceId(pid)
          return pid
        }
      } catch { /* try next */ }
    }
    return null
  }

  async function fetchPlacesPhotos() {
    let refs = placesPhotos
    // If no photo refs yet (edit mode), resolve placeId and fetch details
    if (!refs.length) {
      setFetchingPhotos(true)
      try {
        const pid = await resolveGooglePlaceId()
        if (pid) {
          const detRes = await fetch(`/api/places-details?place_id=${pid}`)
          const detData = await detRes.json()
          if (detData.photos?.length) {
            refs = detData.photos
          }
        }
      } catch { /* skip */ }
      if (!refs.length) {
        setFetchingPhotos(false)
        toast({ title: "Google Photos", description: "No photos found - try entering the venue name", variant: "destructive" })
        return
      }
    }
    setFetchingPhotos(true)
    const fetched: MediaItem[] = []
    for (const photoName of refs) {
      try {
        const r = await fetch(`/api/places-photo?name=${encodeURIComponent(photoName)}`)
        if (r.ok) {
          const item = await r.json()
          fetched.push({ url: item.url, type: item.type as "IMAGE" })
        }
      } catch { /* skip */ }
    }
    if (fetched.length > 0) {
      setMediaItems(prev => [...prev, ...fetched])
      toast({ title: `${fetched.length} photo(s) added` })
    }
    setPlacesPhotos([])
    setFetchingPhotos(false)
  }

  const [scraping, setScraping] = useState(false)
  async function scrapeGoogleInfo() {
    const nameInput = document.getElementById("name") as HTMLInputElement | null
    const venueName = nameInput?.value?.trim()
    if (!venueName && !address && !placeId) {
      toast({ title: "Scrape", description: "Enter a venue name or address first", variant: "destructive" })
      return
    }
    setScraping(true)
    try {
      const pid = await resolveGooglePlaceId()
      if (!pid) {
        toast({ title: "Scrape", description: "Place not found on Google", variant: "destructive" })
        setScraping(false)
        return
      }
      const detRes = await fetch(`/api/places-details?place_id=${pid}`)
      const detData = await detRes.json()
      const filled: string[] = []
      if (detData.website) { setWebsite(detData.website); filled.push("website") }
      if (detData.phone) {
        const cleaned = detData.phone.replace(/^\+?66\s?/, "").replace(/\s/g, " ")
        setPhone(cleaned)
        filled.push("phone")
      }
      if (detData.hours) { setSchedule(prev => ({ ...prev, ...detData.hours })); filled.push("hours") }
      if (detData.photos?.length) { setPlacesPhotos(detData.photos); filled.push(`${detData.photos.length} photos`) }
      if (detData.address && !address) { setAddress(detData.address); filled.push("address") }
      if (detData.lat && detData.lng && !lat) {
        setLat(detData.lat.toFixed(6))
        setLng(detData.lng.toFixed(6))
        filled.push("location")
      }
      if (detData.district && !district) { setDistrict(detData.district); filled.push("district") }
      toast({ title: "Scrape", description: filled.length ? `Fetched: ${filled.join(", ")}` : "No extra info found" })
    } catch {
      toast({ title: "Scrape failed", variant: "destructive" })
    } finally { setScraping(false) }
  }

  function openGoogleMaps() {
    const q = address ? encodeURIComponent(`${address}, Pattaya Thailand`) : "Pattaya,Thailand"
    window.open(`https://www.google.com/maps/search/${q}`, "_blank")
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("categoryId", categoryId)
    fd.set("priceRange", priceRange)
    fd.set("lat", lat)
    fd.set("lng", lng)
    fd.set("hours", serializeHours(schedule))
    fd.set("imageUrl", mediaItems[0]?.url ?? "")
    fd.set("additionalMedia", JSON.stringify(mediaItems.slice(1)))

    startTransition(async () => {
      const result = initialData?.id
        ? await updateVenueAdmin(initialData.id, fd)
        : await createVenueAdmin(fd)
      if (result.success) {
        toast({ title: initialData?.id ? t("spotUpdated") : t("spotCreated"), description: result.data.name })
        router.push(`/places/${result.data.slug}`)
      } else {
        toast({ title: tc("error"), description: result.error, variant: "destructive" })
      }
    })
  }

  const d = initialData ?? {}

  // Filter out community-only categories
  const spotCategories = categories.filter(c => !COMMUNITY_SLUGS.has(c.slug))

  // Get selected category slug for conditional rendering
  const selectedSlug = categories.find(c => c.id === categoryId)?.slug
  const visibleGroups = getVisibleGroups(selectedSlug)
  const showHotel = selectedSlug ? HOTEL_SLUGS.has(selectedSlug) : false
  const showGames = selectedSlug ? HAS_GAMES_SLUGS.has(selectedSlug) : false
  const isMassage = selectedSlug ? MASSAGE_SLUGS.has(selectedSlug) : false
  const isHotel = selectedSlug ? HOTEL_SLUGS.has(selectedSlug) : false
  const isFreelance = selectedSlug ? FREELANCE_SLUGS.has(selectedSlug) : false

  // Which pricing sub-sections exist
  const hasDrinks = visibleGroups.has("drinks") || visibleGroups.has("ladyDrink") || visibleGroups.has("bottle")
  const hasTables = visibleGroups.has("clubTables")
  const hasBarfineTime = visibleGroups.has("barfine") || visibleGroups.has("shortLong") || visibleGroups.has("room")
  const hasServices = visibleGroups.has("bj") || visibleGroups.has("boomBoom")
  const hasMassagePricing = visibleGroups.has("massage")
  const hasCoffeePricing = visibleGroups.has("coffee")
  const isCoffee = selectedSlug ? COFFEE_SLUGS.has(selectedSlug) : false

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border satine-border bg-card p-6">

      {/* Basic info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">{t("spotName")} *</Label>
          <Input id="name" name="name" defaultValue={d.name} placeholder="e.g. Windmill Club" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <MentionInput
            name="description"
            value={description}
            onChange={setDescription}
            placeholder={t("shortDescription")}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("category")} *</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
            <SelectContent>
              {spotCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.icon} {tcat.has(cat.slug) ? tcat(cat.slug) : cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("priceRange")}</Label>
          <Select value={priceRange || "__none__"} onValueChange={(v) => setPriceRange(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("selectPriceRange")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("notSpecified")}</SelectItem>
              <SelectItem value="$">{t("budgetOption")}</SelectItem>
              <SelectItem value="$$">{t("midOption")}</SelectItem>
              <SelectItem value="$$$">{t("premiumOption")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing details - split into sections, fields depend on category */}
      {categoryId && (
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          {t("pricingThb")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5">

          {/* Massage pricing - shown FIRST for massage categories */}
          {isMassage && hasMassagePricing && <>
            <SectionSeparator label={tp("massage")} color="#10B981" />
            <PriceInput id="priceThaiMassage" name="priceThaiMassage" label={`🙏 ${tp("thaiMassageLabel")}`} defaultValue={d.priceThaiMassage} placeholder="300" />
            <PriceInput id="priceFootMassage" name="priceFootMassage" label={`🦶 ${tp("footMassageLabel")}`} defaultValue={d.priceFootMassage} placeholder="300" />
            <PriceInput id="priceOilMassage" name="priceOilMassage" label={`💆 ${tp("oilMassageLabel")}`} defaultValue={d.priceOilMassage} placeholder="500" />
          </>}

          {/* Cannabis */}
          {hasCoffeePricing && <>
            <SectionSeparator label={tp("coffeeFood")} color="#22C55E" />
            <PriceInput id="priceCoffeeMin" name="priceCoffeeMin" label={`🌿 ${tp("coffeeLabel")} Min`} defaultValue={d.priceCoffeeMin} placeholder="200" />
            <PriceInput id="priceCoffeeMax" name="priceCoffeeMax" label={`🌿 ${tp("coffeeLabel")} Max`} defaultValue={d.priceCoffeeMax} placeholder="500" />
            <PriceInput id="priceFoodMin" name="priceFoodMin" label={`🚬 ${tp("foodLabel")} Min`} defaultValue={d.priceFoodMin} placeholder="80" />
            <PriceInput id="priceFoodMax" name="priceFoodMax" label={`🚬 ${tp("foodLabel")} Max`} defaultValue={d.priceFoodMax} placeholder="200" />
          </>}

          {/* Drinks */}
          {hasDrinks && <>
            <SectionSeparator label={tp("drinks")} color="#3db8a0" />
            {visibleGroups.has("drinks") && <>
              <PriceInput id="priceSoftDrink" name="priceSoftDrink" label={`🥤 ${tp("softDrinkLabel")}`} defaultValue={d.priceSoftDrink} placeholder="60" />
              <PriceInput id="priceBeerMin" name="priceBeerMin" label={`🍺 ${tp("beerMin")}`} defaultValue={d.priceBeerMin} placeholder="80" />
              <PriceInput id="priceBeerMax" name="priceBeerMax" label={`🍺 ${tp("beerMax")}`} defaultValue={d.priceBeerMax} placeholder="120" />
              <PriceInput id="priceAlcoholMin" name="priceAlcoholMin" label={`🥃 ${tp("alcoholMin")}`} defaultValue={d.priceAlcoholMin} placeholder="100" />
              <PriceInput id="priceAlcoholMax" name="priceAlcoholMax" label={`🥃 ${tp("alcoholMax")}`} defaultValue={d.priceAlcoholMax} placeholder="250" />
            </>}
            {visibleGroups.has("ladyDrink") && (
              <PriceInput id="priceLadyDrink" name="priceLadyDrink" label={`💋 ${tp("ladyDrinkLabel")}`} defaultValue={d.priceLadyDrink} placeholder="180" />
            )}
            {visibleGroups.has("bottle") && <>
              <PriceInput id="priceBottleMin" name="priceBottleMin" label={`🍾 ${tp("bottleMin")}`} defaultValue={d.priceBottleMin} placeholder="2000" />
              <PriceInput id="priceBottleMax" name="priceBottleMax" label={`🍾 ${tp("bottleMax")}`} defaultValue={d.priceBottleMax} placeholder="10000" />
            </>}
          </>}

          {/* Tables */}
          {hasTables && <>
            <SectionSeparator label={tp("tables")} color="#e07850" />
            {visibleGroups.has("clubTables") && <>
              <PriceInput id="priceTableSmall" name="priceTableSmall" label={`🪑 ${tp("smallTableLabel")}`} defaultValue={d.priceTableSmall} placeholder="1000" />
              <PriceInput id="priceTableMedium" name="priceTableMedium" label={`🪑 ${tp("mediumTableLabel")}`} defaultValue={d.priceTableMedium} placeholder="3000" />
              <PriceInput id="priceTableLarge" name="priceTableLarge" label={`👑 ${tp("vipTableLabel")}`} defaultValue={d.priceTableLarge} placeholder="5000" />
            </>}
          </>}

          {/* Barfine & Room */}
          {hasBarfineTime && <>
            <SectionSeparator label={isHotel ? tp("roomPricing") : tp("barfineStLt")} color="#ff9f43" />
            {visibleGroups.has("barfine") && <>
              <PriceInput id="priceBarfineMin" name="priceBarfineMin" label={`💸 ${tp("barfineLabel")} Min`} defaultValue={d.priceBarfineMin} placeholder="1000" />
              <PriceInput id="priceBarfineMax" name="priceBarfineMax" label={`💸 ${tp("barfineLabel")} Max`} defaultValue={d.priceBarfineMax} placeholder="2000" />
            </>}
            {visibleGroups.has("shortLong") && <>
              <PriceInput id="priceShortTimeMin" name="priceShortTimeMin" label={isHotel ? `⏱ ${tp("oneHour")} Min` : `⏱ ${tp("shortTimeLabel")} Min`} defaultValue={d.priceShortTimeMin} placeholder={isHotel ? "500" : "1500"} />
              <PriceInput id="priceShortTimeMax" name="priceShortTimeMax" label={isHotel ? `⏱ ${tp("oneHour")} Max` : `⏱ ${tp("shortTimeLabel")} Max`} defaultValue={d.priceShortTimeMax} placeholder={isHotel ? "800" : "3000"} />
              <PriceInput id="priceLongTimeMin" name="priceLongTimeMin" label={isHotel ? `🌙 ${tp("night")} Min` : `🌙 ${tp("longTimeLabel")} Min`} defaultValue={d.priceLongTimeMin} placeholder={isHotel ? "800" : "3000"} />
              <PriceInput id="priceLongTimeMax" name="priceLongTimeMax" label={isHotel ? `🌙 ${tp("night")} Max` : `🌙 ${tp("longTimeLabel")} Max`} defaultValue={d.priceLongTimeMax} placeholder={isHotel ? "1500" : "6000"} />
            </>}
            {visibleGroups.has("room") && <>
              <PriceInput id="priceRoomSmall" name="priceRoomSmall" label={`🛏 ${tp("smallRoomLabel")}`} defaultValue={d.priceRoomSmall} placeholder="500" />
              <PriceInput id="priceRoomLarge" name="priceRoomLarge" label={`🛏 ${tp("roomLabel")}`} defaultValue={d.priceRoomLarge} placeholder="1000" />
            </>}
          </>}

          {/* Services (sexual) */}
          {hasServices && <>
            <SectionSeparator label={tp("services")} color="#e8a840" />
            {visibleGroups.has("bj") && (
              <PriceInput id="priceBJ" name="priceBJ" label={`💦 ${tp("blowjob")}`} defaultValue={d.priceBJ} placeholder="1500" />
            )}
            {visibleGroups.has("boomBoom") && (
              <PriceInput id="priceBoomBoom" name="priceBoomBoom" label={`🔥 ${tp("boomBoomLabel")}`} defaultValue={d.priceBoomBoom} placeholder="2500" />
            )}
          </>}

          {/* Massage pricing - shown AFTER services for non-massage categories */}
          {!isMassage && hasMassagePricing && <>
            <SectionSeparator label={tp("massage")} color="#10B981" />
            <PriceInput id="priceThaiMassage" name="priceThaiMassage" label={`🙏 ${tp("thaiMassageLabel")}`} defaultValue={d.priceThaiMassage} placeholder="300" />
            <PriceInput id="priceFootMassage" name="priceFootMassage" label={`🦶 ${tp("footMassageLabel")}`} defaultValue={d.priceFootMassage} placeholder="300" />
            <PriceInput id="priceOilMassage" name="priceOilMassage" label={`💆 ${tp("oilMassageLabel")}`} defaultValue={d.priceOilMassage} placeholder="500" />
          </>}
        </div>
      </div>
      )}

      {/* Hotel details - only for Short-Time Hotel */}
      {showHotel && (
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-400" />
          {t("hotelDetails")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hotelStars" className="text-xs text-muted-foreground">{t("stars")}</Label>
            <Input id="hotelStars" name="hotelStars" type="number" min="1" max="5" defaultValue={d.hotelStars ?? ""} placeholder="1-5" />
          </div>
        </div>
      </div>
      )}

      {/* Amenities - only for bars, ktv, gentleman's, bj-bar */}
      {showGames && (
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-blue-400" />
          {t("gamesAndAmenities")}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "hasPool", label: `🎱 ${t("poolTables")}`, countName: "poolCount", countDefault: d.poolCount, checked: d.hasPool },
            { name: "hasDarts", label: `🎯 ${t("dartsLabel")}`, countName: "dartsCount", countDefault: d.dartsCount, checked: d.hasDarts },
            { name: "hasCardGames", label: `🃏 ${t("cardGames")}`, checked: d.hasCardGames },
            { name: "hasJenga", label: `🎲 ${t("dicesLabel")}`, checked: d.hasJenga },
            { name: "hasBeerPong", label: `🏓 ${t("beerPongLabel")}`, checked: d.hasBeerPong },
            { name: "hasConsoles", label: `🎮 ${t("consolesLabel")}`, checked: d.hasConsoles },
            { name: "hasBoardGames", label: `♟️ ${t("boardGamesLabel")}`, checked: d.hasBoardGames },
            { name: "hasWifi", label: `📶 ${t("wifiLabel")}`, checked: d.hasWifi },
            { name: "hasTV", label: `📺 ${t("tvLabel")}`, checked: d.hasTV },
          ].map(amenity => (
            <div key={amenity.name} className="flex items-center gap-2 rounded-lg border border-[rgba(232,168,64,0.15)] p-2.5">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input type="checkbox" name={amenity.name} defaultChecked={amenity.checked} className="rounded" />
                <span className="text-sm">{amenity.label}</span>
              </label>
              {amenity.countName && (
                <Input
                  name={amenity.countName}
                  type="number"
                  defaultValue={amenity.countDefault ?? ""}
                  placeholder="qty"
                  className="h-7 w-16 text-xs"
                  min={1}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Profile & Ambiance */}
      <div className="space-y-3 rounded-xl border border-[rgba(61,184,160,0.30)] bg-[rgba(61,184,160,0.05)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          🏷️ Profile & Ambiance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { name: "isKidFriendly", label: "👶 Kid-Friendly", checked: d.isKidFriendly },
            { name: "goodForFamilies", label: "👨‍👩‍👧‍👦 Family", checked: d.goodForFamilies },
            { name: "isWheelchairFriendly", label: "♿ Wheelchair", checked: d.isWheelchairFriendly },
            { name: "isRainyDayFriendly", label: "🌧️ Rainy Day", checked: d.isRainyDayFriendly },
            { name: "hasParking", label: "🅿️ Parking", checked: d.hasParking },
            { name: "goodForDigitalNomad", label: "💻 Digital Nomad", checked: d.goodForDigitalNomad },
            { name: "petFriendly", label: "🐾 Pet-Friendly", checked: d.petFriendly },
          ].map(flag => (
            <div key={flag.name} className="flex items-center gap-2 rounded-lg border border-[rgba(61,184,160,0.15)] p-2.5">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input type="checkbox" name={flag.name} defaultChecked={flag.checked} className="rounded" />
                <span className="text-sm">{flag.label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Freelance Area fields */}
      {isFreelance && (
      <div className="space-y-3 rounded-xl border border-[rgba(224,120,80,0.30)] bg-[rgba(224,120,80,0.05)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          🦋 Freelance Area Info
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Geometry Type */}
          <div className="space-y-1">
            <Label htmlFor="geometryType" className="text-xs">Geometry Type</Label>
            <input type="hidden" name="geometryType" value={d.geometryType ?? "circle"} />
            <Select defaultValue={d.geometryType ?? "circle"} onValueChange={(v) => {
              const hidden = document.querySelector('input[name="geometryType"]') as HTMLInputElement
              if (hidden) hidden.value = v
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">⭕ Circle (corner spot)</SelectItem>
                <SelectItem value="polyline">📏 Polyline (street strip)</SelectItem>
                <SelectItem value="polygon">🔷 Polygon (irregular zone)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Zone Type */}
          <div className="space-y-1">
            <Label htmlFor="zoneType" className="text-xs">Zone Type</Label>
            <input type="hidden" name="zoneType" value={d.zoneType ?? "street-strip"} />
            <Select defaultValue={d.zoneType ?? "street-strip"} onValueChange={(v) => {
              const hidden = document.querySelector('input[name="zoneType"]') as HTMLInputElement
              if (hidden) hidden.value = v
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="street-strip">🛣️ Street Strip</SelectItem>
                <SelectItem value="corner-spot">📍 Corner Spot</SelectItem>
                <SelectItem value="zone">🗺️ Zone / Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Radius (circle) */}
          <div className="space-y-1">
            <Label htmlFor="areaRadius" className="text-xs">Radius (meters) - for circles</Label>
            <Input id="areaRadius" name="areaRadius" type="number" defaultValue={d.areaRadius ?? 200} placeholder="200" className="h-8 text-xs" />
          </div>
          {/* Width hint (polyline corridor) */}
          <div className="space-y-1">
            <Label htmlFor="widthHintMeters" className="text-xs">Width hint (meters) - for polylines</Label>
            <Input id="widthHintMeters" name="widthHintMeters" type="number" defaultValue={d.widthHintMeters ?? 30} placeholder="30" className="h-8 text-xs" />
          </div>
          {/* Geometry Path (polyline/polygon) */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="geometryPath" className="text-xs">Geometry Path (JSON: [[lat,lng], ...]) - for polyline/polygon</Label>
            <textarea id="geometryPath" name="geometryPath" defaultValue={d.geometryPath ?? ""} rows={3}
              placeholder='[[12.9320, 100.8820], [12.9340, 100.8830], [12.9360, 100.8825]]'
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {/* Best hours */}
          <div className="space-y-1">
            <Label htmlFor="bestHours" className="text-xs">Best Hours</Label>
            <Input id="bestHours" name="bestHours" defaultValue={d.bestHours ?? ""} placeholder="e.g. 22:00–02:00" className="h-8 text-xs" />
          </div>
          {/* Budget */}
          <div className="space-y-1">
            <Label className="text-xs">Typical Budget (THB)</Label>
            <div className="flex gap-2">
              <Input name="typicalBudgetMin" type="number" defaultValue={d.typicalBudgetMin ?? ""} placeholder="Min" className="h-8 text-xs" />
              <Input name="typicalBudgetMax" type="number" defaultValue={d.typicalBudgetMax ?? ""} placeholder="Max" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="crowdStyle" className="text-xs">Crowd / Style</Label>
            <Input id="crowdStyle" name="crowdStyle" defaultValue={d.crowdStyle ?? ""} placeholder="e.g. Street freelancers, mixed ages, tourist-heavy" className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="safetyNote" className="text-xs">Safety / Scam Note</Label>
            <Input id="safetyNote" name="safetyNote" defaultValue={d.safetyNote ?? ""} placeholder="e.g. Watch for ladyboy pickpockets near..." className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="nearbyHotels" className="text-xs">Nearby Hotels (JSON array)</Label>
            <Input id="nearbyHotels" name="nearbyHotels" defaultValue={d.nearbyHotels ?? ""} placeholder='["Hotel A", "Hotel B"]' className="h-8 text-xs" />
          </div>
        </div>
      </div>
      )}

      {/* Location */}
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {t("location")}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">{t("streetAddress")}</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <AddressAutocomplete
                  id="address"
                  name="address"
                  value={address}
                  onChange={setAddress}
                  onSelect={(addr, latVal, lngVal, extra) => {
                    setAddress(extra?.formattedAddress || addr)
                    setLat(latVal.toFixed(6))
                    setLng(lngVal.toFixed(6))
                    if (extra?.district && !district) setDistrict(extra.district)
                    toast({ title: t("locationFound"), description: `${latVal.toFixed(4)}, ${lngVal.toFixed(4)}` })
                    if (extra?.photos?.length) setPlacesPhotos(extra.photos)
                    if (extra?.placeId) setPlaceId(extra.placeId)
                    // Auto-fill contact info from Google Places
                    if (extra?.website && !website) setWebsite(extra.website)
                    if (extra?.phone) {
                      const cleaned = extra.phone.replace(/^\+?66\s?/, "").replace(/\s/g, " ")
                      if (!phone) setPhone(cleaned)
                    }
                    if (extra?.hours) setSchedule(prev => ({ ...prev, ...extra.hours }))
                  }}
                  placeholder="e.g. Telephone Bar Pattaya"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={geocodeAddress} disabled={geocoding} className="shrink-0">
                {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1.5">{t("locate")}</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={openGoogleMaps} className="shrink-0">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">{t("maps")}</span>
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("district")}</Label>
            <input type="hidden" name="district" value={district} />
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger><SelectValue placeholder="- Select district -" /></SelectTrigger>
              <SelectContent>
                {DISTRICTS.map(d => (
                  <SelectItem key={d.id} value={d.id}>📍 {d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{t("city")}</Label>
            <Input id="city" name="city" defaultValue="Pattaya" />
          </div>
        </div>
        {lat && lng && (
          <div className="rounded-lg overflow-hidden border border-[rgba(232,168,64,0.20)] mt-2">
            <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-muted-foreground">Loading map...</div>}>
              <DraggableMap
                lat={parseFloat(lat)}
                lng={parseFloat(lng)}
                locale={locale}
                onMove={(newLat, newLng) => {
                  setLat(String(newLat))
                  setLng(String(newLng))
                }}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Photos - unified list, first = cover, drag to reorder */}
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              {t("coverImage")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("coverImageDesc")} - {t("firstPhotoIsCover")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={fetchingPhotos} className="shrink-0 gap-1.5" onClick={() => fetchPlacesPhotos()}>
            {fetchingPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {fetchingPhotos ? "Downloading..." : placesPhotos.length > 0 ? `Google Photos (${placesPhotos.length})` : "Google Photos"}
          </Button>
        </div>
        <MediaUploader value={mediaItems} onChange={setMediaItems} maxFiles={10} accept="image/jpeg,image/png,image/webp,image/gif" />
      </div>

      {/* Contact - no phoneType */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm">Contact</h3>
        <Button type="button" variant="outline" size="sm" disabled={scraping} className="shrink-0 gap-1.5" onClick={() => scrapeGoogleInfo()}>
          {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {scraping ? "Scraping..." : "Scrap Google Info"}
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">+66</span>
            <Input id="phone" name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="38 xxx xxx" className="pl-11" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">+66</span>
            <Input id="whatsapp" name="whatsapp" defaultValue={d.whatsapp?.replace(/^\+?66\s?/, "") ?? ""} placeholder="8x xxx xxxx" className="pl-11" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lineId">{t("lineId")}</Label>
          <Input id="lineId" name="lineId" defaultValue={d.lineId ?? ""} placeholder="@venuehandle" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lineQrUrl">{t("lineQrUrl")}</Label>
          <Input id="lineQrUrl" name="lineQrUrl" defaultValue={d.lineQrUrl ?? ""} placeholder="https://qr.line.me/..." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="website">{t("website")}</Label>
          <Input id="website" name="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="facebook">Facebook</Label>
          <Input id="facebook" name="facebook" defaultValue={d.facebook ?? ""} placeholder="https://facebook.com/..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" name="instagram" defaultValue={d.instagram ?? ""} placeholder="https://instagram.com/..." />
        </div>
      </div>

      {/* Opening hours */}
      <div className="space-y-3 rounded-xl border border-[rgba(232,168,64,0.20)] p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {t("openingHours")}
        </h3>
        <OpeningHoursEditor value={schedule} onChange={setSchedule} t={t} />
      </div>

      {/* Toggles - isVerified checked by default */}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isVerified" defaultChecked={d.isVerified ?? true} className="rounded" />
          <span className="text-sm">{t("verifiedSpot")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={d.isActive ?? true} className="rounded" />
          <span className="text-sm">{t("activeVisible")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="permanentlyClosed" defaultChecked={d.permanentlyClosed ?? false} className="rounded border-red-500" />
          <span className="text-sm text-red-400">☠️ Permanently Closed</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isRecommended" defaultChecked={d.isRecommended ?? false} className="rounded border-orange-500" />
          <span className="text-sm text-orange-400">🔥 Fire Spot</span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || !categoryId} className="flex-1">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? t("saving") : d.id ? t("updateSpot") : t("createSpot")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>{tc("cancel")}</Button>
      </div>
    </form>
  )
}
