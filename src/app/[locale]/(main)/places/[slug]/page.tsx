import React from "react"
import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import Script from "next/script"
import { notFound } from "next/navigation"
import { getVenueBySlug } from "@/actions/venues"
import { getMyVenueRating } from "@/actions/venue-ratings"
import { getVenueComments } from "@/actions/venue-comments"
import { PostCard } from "@/components/posts/post-card"
import { VenueRatingForm } from "@/components/venues/venue-rating-form"
import { VenueCommentSection } from "@/components/venues/venue-comments"
import { VenueMediaGallery } from "@/components/venues/venue-media-gallery"
import { VenueMenuGallery } from "@/components/venues/venue-menu-gallery"
import { VenueViewTracker } from "@/components/venues/venue-view-tracker"
import { getDistrictLabel } from "@/lib/districts"
import { getCriteriaForCategory } from "@/lib/rating-criteria"
import { getCurrentUserId } from "@/lib/auth/session"
import { MapPin, Phone, Clock, Globe, Star, MessageSquare, Hash, MessageCircle, Gamepad2, Flame, Pencil, Facebook, Instagram } from "lucide-react"
import { VenueMap } from "@/components/venues/venue-map"
import { VenueDetailTabs } from "@/components/venues/venue-detail-tabs"
import { HeroGalleryTrigger } from "@/components/venues/hero-gallery-trigger"
import { getVenueStatus, formatSmartHours, formatDailyHours } from "@/lib/venue-hours"
import { Button } from "@/components/ui/button"
import { VenueFavoriteButton } from "@/components/venues/venue-favorite-button"
import { VenueDeleteButton } from "@/components/venues/venue-delete-button"
import { isVenueFavorited } from "@/actions/venue-favorites"
import { ScrollToComment } from "@/components/ui/scroll-to-comment"
import { MentionText } from "@/components/ui/mention-text"
import { RatingRow } from "@/components/posts/star-rating"
import { VenueIndividualRatings } from "@/components/venues/venue-individual-ratings"
import { getTranslations, getLocale } from "next-intl/server"
import { Suspense } from "react"

interface VenuePageProps {
  params: Promise<{ slug: string }>
}

/** Strip Plus Code prefix (e.g. "WVGP+59R, ") from an address for display */
function stripPlusCode(address: string): string {
  return address.replace(/^[A-Z0-9]{4,}\+[A-Z0-9]{2,},?\s*/i, "")
}

export const revalidate = 300

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getVenueBySlug(slug)
  if (!result.success) return { title: "Spot not found" } // metadata - no t() available here
  const v = result.data
  const title = `${v.name} - ${v.category.name} in Pattaya`
  const description = v.description || `Read community reviews for ${v.name}, a ${v.category.name} in Pattaya, Thailand.`
  // Note: metadata uses English category names (SEO)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: v.imageUrl ? [{ url: v.imageUrl, width: 800, height: 450 }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: v.imageUrl ? [v.imageUrl] : [],
    },
    alternates: {
      canonical: `/places/${slug}`,
    },
  }
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { slug } = await params
  const result = await getVenueBySlug(slug)
  if (!result.success) notFound()

  const venue = result.data

  const t = await getTranslations("spots")
  const tp = await getTranslations("priceFilters")
  const tc = await getTranslations("categoryNames")

  const STATUS_CONFIG = {
    open: { color: "bg-green-500", label: t("openStatus"), textColor: "text-green-400" },
    closed: { color: "bg-red-500", label: t("closedStatus"), textColor: "text-red-400" },
    "closing-soon": { color: "bg-yellow-500", label: t("closingSoon"), textColor: "text-yellow-400" },
  } as const

  const criteria = getCriteriaForCategory(venue.category.slug)
  const { prisma } = await import("@/lib/prisma")

  const [userId, venueRatings] = await Promise.all([
    getCurrentUserId(),
    prisma.venueRating.findMany({
      where: { venueId: venue.id },
      select: {
        id: true, scores: true, overall: true, createdAt: true,
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const [venueFavorited, isAdmin] = await Promise.all([
    userId ? isVenueFavorited(venue.id) : Promise.resolve(false),
    userId ? prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }).then(p => !!p?.isAdmin) : Promise.resolve(false),
  ])

  const allCriteriaAvgs: Record<string, number> = {}
  let totalRatingCount = 0

  if (venueRatings.length > 0) {
    totalRatingCount = venueRatings.length
    const keyBuckets: Record<string, number[]> = {}
    for (const r of venueRatings) {
      try {
        const scores = JSON.parse(r.scores) as Record<string, number>
        for (const [k, v] of Object.entries(scores)) {
          if (!keyBuckets[k]) keyBuckets[k] = []
          keyBuckets[k].push(v)
        }
      } catch {}
    }
    for (const [k, vals] of Object.entries(keyBuckets)) {
      allCriteriaAvgs[k] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
    }
  } else if (venue.posts.length > 0) {
    const postIds = venue.posts.map((p: any) => p.id)
    const allRatings = await prisma.rating.findMany({
      where: { postId: { in: postIds } },
      select: { scores: true, overall: true },
    })
    totalRatingCount = allRatings.length
    const keyBuckets: Record<string, number[]> = {}
    for (const r of allRatings) {
      try {
        const scores = JSON.parse(r.scores) as Record<string, number>
        for (const [k, v] of Object.entries(scores)) {
          if (!keyBuckets[k]) keyBuckets[k] = []
          keyBuckets[k].push(v)
        }
      } catch {}
    }
    for (const [k, vals] of Object.entries(keyBuckets)) {
      allCriteriaAvgs[k] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
    }
  }

  let displayAvgRating = venue.avgRating
  let displayRatingCount = venue.ratingCount
  if (venueRatings.length > 0) {
    const sum = venueRatings.reduce((s, r) => s + r.overall, 0)
    displayAvgRating = Number((sum / venueRatings.length).toFixed(1))
    displayRatingCount = venueRatings.length
  }

  // Compute category rank based on displayAvgRating
  let categoryRank: number | null = null
  if (displayAvgRating && displayAvgRating > 0) {
    // Count venues in same category with higher avg rating (from VenueRating)
    const result = await prisma.$queryRawUnsafe<{ rank: bigint }[]>(`
      SELECT COUNT(*) + 1 AS rank FROM (
        SELECT vr."venueId", AVG(vr."overall") AS avg_rating
        FROM "VenueRating" vr
        JOIN "Venue" v ON v."id" = vr."venueId"
        WHERE v."categoryId" = $1 AND vr."venueId" != $2
        GROUP BY vr."venueId"
        HAVING AVG(vr."overall") > $3
      ) ranked
    `, venue.categoryId, venue.id, displayAvgRating)
    categoryRank = result[0] ? Number(result[0].rank) : 1
  }

  const myRatingResult = userId ? await getMyVenueRating(venue.id) : null
  const myRating = myRatingResult?.success ? myRatingResult.data : null
  const alreadyRated = !!myRating

  const [postMentions, commentMentions] = await Promise.all([
    prisma.post.count({ where: { content: { contains: `@${venue.slug}` }, deletedAt: null } }),
    prisma.comment.count({ where: { content: { contains: `@${venue.slug}` }, deletedAt: null } }),
  ])
  const mentionCount = postMentions + commentMentions

  const venueComments = await getVenueComments(venue.id)
  const locale = await getLocale()
  const smartHours = formatSmartHours(venue.hours, locale)
  const dailyHours = formatDailyHours(venue.hours, locale)
  const venueStatus = getVenueStatus(venue.hours)
  const statusCfg = STATUS_CONFIG[venueStatus]

  // Access pricing fields via any cast
  const v = venue as any

  // ── Category-aware price fields (same logic as homepage filters) ──
  const MASSAGE_SLUGS = new Set(["massage", "ladyboy-massage", "gay-massage"])
  const CLUB_SLUGS = new Set(["club", "gay-club", "ladyboy-club"])
  const BJ_SLUGS = new Set(["bj-bar"])
  const GOGO_SLUGS = new Set(["gogo-bar", "russian-gogo", "gay-gogo", "ladyboy-gogo"])
  const GENTLEMANS_SLUGS = new Set(["gentlemans-club", "ladyboy-gentlemens-club"])
  const GIRLY_BAR_SLUGS = new Set(["girly-bar", "gay-bar", "ladyboy-bar"])
  const NORMAL_BAR_SLUGS = new Set(["bar"])
  const KTV_SLUGS = new Set(["ktv"])
  const HOTEL_SLUGS = new Set(["short-time-hotel"])

  type PriceField = { label: string; emoji: string; valueKey: string; maxKey?: string; group: string }

  const ALL_PRICE_FIELDS: PriceField[] = [
    // Drinks
    { label: tp("softDrink"), emoji: "🥤", valueKey: "priceSoftDrink", group: "drinks" },
    { label: tp("beer"), emoji: "🍺", valueKey: "priceBeerMin", maxKey: "priceBeerMax", group: "drinks" },
    { label: tp("alcohol"), emoji: "🥃", valueKey: "priceAlcoholMin", maxKey: "priceAlcoholMax", group: "drinks" },
    { label: tp("bottle"), emoji: "🍾", valueKey: "priceBottleMin", maxKey: "priceBottleMax", group: "drinks" },
    { label: tp("ladyDrink"), emoji: "💋", valueKey: "priceLadyDrink", group: "drinks" },
    // Tables
    { label: tp("smallTable"), emoji: "🪑", valueKey: "priceTableSmall", group: "tables" },
    { label: tp("mediumTable"), emoji: "🪑", valueKey: "priceTableMedium", group: "tables" },
    { label: tp("vipTable"), emoji: "👑", valueKey: "priceTableLarge", group: "tables" },
    // Barfine / ST / LT
    { label: tp("barfine"), emoji: "💸", valueKey: "priceBarfineMin", maxKey: "priceBarfineMax", group: "barfine" },
    { label: tp("shortTime"), emoji: "⏱", valueKey: "priceShortTimeMin", maxKey: "priceShortTimeMax", group: "barfine" },
    { label: tp("longTime"), emoji: "🌙", valueKey: "priceLongTimeMin", maxKey: "priceLongTimeMax", group: "barfine" },
    // Services
    { label: tp("smallRoom"), emoji: "🛏", valueKey: "priceRoomSmall", group: "services" },
    { label: tp("room"), emoji: "🛏", valueKey: "priceRoomLarge", group: "services" },
    { label: tp("bj"), emoji: "💦", valueKey: "priceBJ", group: "services" },
    { label: tp("boomBoom"), emoji: "🔥", valueKey: "priceBoomBoom", group: "services" },
    // Massage
    { label: tp("footMassage"), emoji: "🦶", valueKey: "priceFootMassage", group: "massage" },
    { label: tp("oilMassage"), emoji: "💆", valueKey: "priceOilMassage", group: "massage" },
  ]

  // Map filter keys to price field keys to determine visibility
  const FILTER_TO_FIELDS: Record<string, string[]> = {
    softMax: ["priceSoftDrink"],
    beerMax: ["priceBeerMin", "priceBeerMax"],
    alcoholMax: ["priceAlcoholMin", "priceAlcoholMax"],
    bottleMax: ["priceBottleMin", "priceBottleMax"],
    ladyDrinkMax: ["priceLadyDrink"],
    tableSmallMax: ["priceTableSmall"],
    tableMediumMax: ["priceTableMedium"],
    tableLargeMax: ["priceTableLarge"],
    barfineMax: ["priceBarfineMin", "priceBarfineMax"],
    shortTimeMax: ["priceShortTimeMin", "priceShortTimeMax"],
    longTimeMax: ["priceLongTimeMin", "priceLongTimeMax"],
    smallRoomMax: ["priceRoomSmall"],
    roomMax: ["priceRoomLarge"],
    bjMax: ["priceBJ"],
    boomBoomMax: ["priceBoomBoom"],
    footMassageMax: ["priceFootMassage"],
    oilMassageMax: ["priceOilMassage"],
  }

  function getVisiblePriceFieldsForVenue(cat: string): string[] {
    if (MASSAGE_SLUGS.has(cat)) return ["footMassageMax", "oilMassageMax", "bjMax", "boomBoomMax"]
    if (CLUB_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax"]
    if (BJ_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
    if (GOGO_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax"]
    if (GENTLEMANS_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
    if (GIRLY_BAR_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
    if (NORMAL_BAR_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "bottleMax"]
    if (KTV_SLUGS.has(cat)) return ["softMax", "beerMax", "alcoholMax", "ladyDrinkMax", "bottleMax", "barfineMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax"]
    if (HOTEL_SLUGS.has(cat)) return ["shortTimeMax", "longTimeMax"]
    return ["softMax", "beerMax", "alcoholMax", "bottleMax", "ladyDrinkMax", "tableSmallMax", "tableMediumMax", "tableLargeMax", "barfineMax", "shortTimeMax", "longTimeMax", "smallRoomMax", "roomMax", "bjMax", "boomBoomMax", "footMassageMax", "oilMassageMax"]
  }

  const visibleFilterKeys = new Set(getVisiblePriceFieldsForVenue(venue.category.slug))
  const visibleValueKeys = new Set<string>()
  for (const fk of visibleFilterKeys) {
    const mapped = FILTER_TO_FIELDS[fk]
    if (mapped) mapped.forEach(k => visibleValueKeys.add(k))
  }
  const visiblePriceFields = ALL_PRICE_FIELDS.filter(f => visibleValueKeys.has(f.valueKey))

  // Group separators config
  const GROUP_SEPARATORS: Record<string, { label: string; color: string }> = {
    drinks: { label: tp("drinks"), color: "#3db8a0" },
    tables: { label: tp("tables"), color: "#e07850" },
    barfine: { label: tp("barfineStLt"), color: "#ff9f43" },
    services: { label: tp("services"), color: "#e8a840" },
    massage: { label: tp("massage"), color: "#10B981" },
  }

  // JSON-LD structured data for Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: venue.name,
    description: venue.description ?? undefined,
    address: venue.address ? {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: (venue.district && getDistrictLabel(venue.district)) || "Pattaya",
      addressRegion: "Chonburi",
      addressCountry: "TH",
    } : undefined,
    telephone: venue.phone ?? undefined,
    url: venue.website ?? undefined,
    image: venue.imageUrl ?? undefined,
    ...(displayAvgRating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: displayAvgRating,
        ratingCount: displayRatingCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }

  // Helper to render price row
  function renderPriceRow(field: typeof ALL_PRICE_FIELDS[number]) {
    const val = v[field.valueKey]
    const maxVal = field.maxKey ? v[field.maxKey] : null
    const display = val ? (maxVal ? `${val}–${maxVal}฿` : `${val}฿`) : "N/A"
    return (
      <div key={field.valueKey} className={`flex items-center justify-between px-3 md:px-2.5 py-2 md:py-1.5 rounded-lg ${val ? "bg-[rgba(75,35,120,0.16)]" : "bg-[rgba(75,35,120,0.08)]"}`}>
        <span className="text-muted-foreground text-sm md:text-xs">{field.emoji} {field.label}</span>
        <span className={`font-medium text-sm md:text-xs ${val ? "" : "text-[rgba(183,148,212,0.40)] italic"}`}>{display}</span>
      </div>
    )
  }

  return (
    <>
    <Script id="venue-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <VenueViewTracker venueId={venue.id} />
    <Suspense><ScrollToComment /></Suspense>
    <div className="space-y-4 md:space-y-3 md:max-w-[960px] md:mx-auto">

      {/* ── Tabbed content ── */}
      <VenueDetailTabs>
        {{
          /* ═══════ TAB: Overview ═══════ */
          overview: (
            <div className="space-y-6 md:space-y-4">
              <div className="rounded-2xl border satine-border bg-card overflow-hidden">
              {/* Banner image - taller aspect ratio */}
        <div className="relative">
          <HeroGalleryTrigger href={`/${locale}/places/${venue.slug}`} className="block aspect-[2.5/1] sm:aspect-[3/1] bg-gradient-to-br from-[rgba(232,168,64,0.10)] via-secondary to-muted relative group cursor-pointer">
            {venue.imageUrl && (
              <Image
                src={venue.imageUrl}
                alt={venue.name}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,21,16,0.90)] via-transparent to-transparent group-hover:from-[rgba(26,21,16,0.70)] transition-colors" />
          </HeroGalleryTrigger>
          {isAdmin && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <Link href={`/admin/venues/${venue.id}/edit`} className="inline-flex items-center justify-center h-[4.5rem] w-[4.5rem] rounded-xl bg-[rgba(26,21,16,0.75)] text-[#3db8a0] border border-[rgba(61,184,160,0.30)] hover:bg-[rgba(61,184,160,0.20)] hover:text-white transition-colors backdrop-blur-sm">
                <Pencil className="h-7 w-7" />
              </Link>
              <VenueDeleteButton venueId={venue.id} />
            </div>
          )}
        </div>

        {/* Info below hero */}
        <div className="p-5 sm:p-6 md:p-4 space-y-2 md:space-y-1.5">
          {/* Permanently closed banner */}
          {venue.permanentlyClosed && (
            <div className="bg-red-950/40 border border-red-500/20 rounded-lg p-4 text-center">
              <p className="text-red-400 font-bold text-lg">🪦 Permanently Closed</p>
              <p className="text-muted-foreground text-sm mt-1">This venue has closed its doors for good. RIP.</p>
            </div>
          )}

          {/* Title row: name + category + badges | favorite + rating */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-xl font-bold bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{venue.name}</h1>
                <Link href={`/?category=${venue.category.slug}`} className="text-sm px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-[#3db8a0] transition-colors">
                  {venue.category.icon} {tc.has(venue.category.slug) ? tc(venue.category.slug) : venue.category.name}
                </Link>
                {categoryRank && categoryRank <= 10 && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[rgba(232,168,64,0.20)] via-[rgba(224,120,80,0.15)] to-[rgba(61,184,160,0.10)] text-[#3db8a0] font-bold flex items-center gap-1 border border-[rgba(61,184,160,0.30)]">
                    <Hash className="h-3.5 w-3.5" />{categoryRank}
                  </span>
                )}
                <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 ${
                  venueStatus === "open" ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                  venueStatus === "closing-soon" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" :
                  "bg-red-500/15 text-red-400 border border-red-500/30"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${statusCfg.color}`} />
                  {statusCfg.label}
                </span>
              </div>
              {/* Extra badges */}
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {venue.isRecommended && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 font-bold flex items-center gap-1 border border-orange-500/30">
                    <Flame className="h-3.5 w-3.5 fill-orange-400" /> FIRE
                  </span>
                )}
                {v.hotelStars && (
                  <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                    {Array.from({ length: v.hotelStars }, (_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </span>
                )}
                {venue.priceRange && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-[rgba(61,184,160,0.10)] text-[#3db8a0] font-semibold border border-[rgba(61,184,160,0.25)] flex items-center gap-0.5">
                    {venue.priceRange}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-4">
              <VenueFavoriteButton
                venueId={venue.id}
                venueSlug={venue.slug}
                initialFavorited={venueFavorited}
                isAuthenticated={!!userId}
              />
              {displayAvgRating && (
                <a href="#reviews" className="text-center bg-[rgba(232,168,64,0.10)] border border-[rgba(232,168,64,0.25)] rounded-xl px-3 md:px-2.5 py-2 md:py-1.5 glow-sm cursor-pointer hover:bg-[rgba(232,168,64,0.18)] transition-colors">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 md:h-3.5 md:w-3.5 fill-[#facc15] text-[#facc15]" />
                    <span className="text-xl md:text-lg font-bold text-foreground">{displayAvgRating}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{displayRatingCount} {displayRatingCount !== 1 ? t("ratings") : t("rating")}</p>
                </a>
              )}
            </div>
          </div>


          {/* Description */}
          {venue.description && (
            <div className="text-muted-foreground text-[18px] md:text-[14px] leading-relaxed md:leading-normal mt-4 md:mt-2">
              {venue.description
                .replace(/(\n\s*){11,}/g, "\n".repeat(10))
                .split("\n")
                .map((line: string, i: number) =>
                  line.trim() === "" ? <br key={i} /> : <p key={i}><MentionText content={line} hashtagContext="spots" /></p>
                )}
            </div>
          )}
              </div>
              </div>
              {/* Contact info - 2-column, centered in each column */}
              <div className="rounded-2xl border satine-border bg-card p-5 md:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 text-sm">
                  {/* Left column - Location & Contact */}
                  <div className="flex flex-col items-center pb-4 sm:pb-0">
                    <div className="flex flex-col gap-3 w-fit">
                      {venue.address && (
                        <div className="flex items-start gap-3 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 text-[rgba(232,168,64,0.60)] shrink-0" />
                          <span className="break-words">{stripPlusCode(venue.address)}{venue.district ? `, ${getDistrictLabel(venue.district) || venue.district}` : ""}, {venue.city}</span>
                        </div>
                      )}
                      {venue.phone && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Phone className="h-4 w-4 text-[rgba(232,168,64,0.60)] shrink-0" />
                          <a href={`tel:${venue.phone}`} className="hover:text-primary">{venue.phone}</a>
                        </div>
                      )}
                      {venue.whatsapp && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <MessageCircle className="h-4 w-4 text-green-400/80 shrink-0" />
                          <a href={`https://wa.me/${venue.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400">
                            {venue.whatsapp} <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400">WhatsApp</span>
                          </a>
                        </div>
                      )}
                      {venue.lineId && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="h-4 w-4 flex items-center justify-center text-[10px] font-bold text-green-300 bg-green-300/10 rounded shrink-0">L</span>
                          <span>LINE: <strong className="text-foreground">{venue.lineId}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column - Web & Social */}
                  <div className="flex flex-col items-center pt-4 sm:pt-0 border-t sm:border-t-0 border-[rgba(232,168,64,0.10)]">
                    <div className="flex flex-col gap-3 w-fit">
                      {venue.website && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Globe className="h-4 w-4 text-[rgba(232,168,64,0.60)] shrink-0" />
                          <a href={venue.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary break-all">{venue.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>
                        </div>
                      )}
                      {venue.facebook && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Facebook className="h-4 w-4 text-[#1877F2] shrink-0" />
                          <a href={venue.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#1877F2]">Facebook</a>
                        </div>
                      )}
                      {venue.instagram && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Instagram className="h-4 w-4 text-[#E4405F] shrink-0" />
                          <a href={venue.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#E4405F]">{venue.instagram.includes("instagram.com/") ? `@${venue.instagram.split("instagram.com/")[1].replace(/\/$/, "")}` : "Instagram"}</a>
                        </div>
                      )}
                      {mentionCount > 0 && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Hash className="h-4 w-4 text-[rgba(232,168,64,0.60)] shrink-0" />
                          <span>{mentionCount} {mentionCount !== 1 ? t("mentions") : t("mention")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours + Map - side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                {/* Opening hours */}
                <div className="rounded-2xl border satine-border bg-card p-5 md:p-4 flex flex-col items-center justify-center">
                  <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
                    <Clock className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
                    {t("openingHours")}
                  </h3>
                  {venue.hours && dailyHours.length > 0 ? (
                    <div className="w-full max-w-[260px] text-sm space-y-1">
                      {dailyHours.map((entry, i) => (
                        <div key={i} className={`flex justify-between gap-3 ${entry.isClosed ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                          <span className="font-medium shrink-0">{entry.day}</span>
                          <span className={entry.is24h ? "text-green-400 font-medium" : entry.isClosed ? "text-red-400/70" : ""}>
                            {entry.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : venue.hours ? (
                    <p className="text-sm text-muted-foreground">{venue.hours}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hours available</p>
                  )}
                </div>

                {/* Map */}
                {venue.lat && venue.lng ? (
                  <div className="rounded-2xl border satine-border bg-card overflow-hidden flex flex-col">
                    <div>
                      <VenueMap
                        lat={venue.lat} lng={venue.lng} name={venue.name} locale={locale}
                        categorySlug={venue.category.slug} categoryColor={venue.category.color}
                        geometryType={venue.geometryType} geometryPath={venue.geometryPath}
                        areaRadius={venue.areaRadius} widthHintMeters={venue.widthHintMeters}
                      />
                    </div>
                    <div className="px-3 py-2 bg-[rgba(75,35,120,0.12)] flex items-center justify-end">
                      <a href={`https://www.google.com/maps?q=${venue.lat},${venue.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        {t("openInGoogleMaps")}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[rgba(232,168,64,0.20)] flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
                    <div className="text-center space-y-1">
                      <MapPin className="h-6 w-6 mx-auto opacity-40" />
                      <p>{t("noMapData")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amenities */}
              {(v.hasPool || v.hasDarts || v.hasConnect4 || v.hasCardGames || v.hasJenga || v.hasBeerPong || v.hasConsoles || v.hasBoardGames || v.hasWifi || v.hasTV) && (
                <div className="rounded-2xl border satine-border bg-card p-5 md:p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3 md:mb-2">
                    <Gamepad2 className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
                    {t("gamesAndAmenities")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {v.hasPool && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🎱 {t("pool")}{v.poolCount ? ` x${v.poolCount}` : ""}</span>}
                    {v.hasDarts && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🎯 {t("darts")}{v.dartsCount ? ` x${v.dartsCount}` : ""}</span>}
                    {v.hasConnect4 && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🔴 {t("connect4")}{v.connect4Count ? ` x${v.connect4Count}` : ""}</span>}
                    {v.hasCardGames && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🃏 {t("cards")}</span>}
                    {v.hasJenga && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🎲 {t("dices")}</span>}
                    {v.hasBeerPong && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🍺 {t("beerPong")}</span>}
                    {v.hasConsoles && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">🎮 {t("consoles")}</span>}
                    {v.hasBoardGames && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">♟️ {t("boardGames")}</span>}
                    {v.hasWifi && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">📶 {t("wifi")}</span>}
                    {v.hasTV && <span className="text-xs md:text-[11px] px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg bg-[rgba(75,35,120,0.24)]">📺 {t("tv")}</span>}
                  </div>
                </div>
              )}

              {/* Owner contact */}
              <div className="rounded-2xl border satine-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {t("ownerContactPrefix")}{" "}
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`@${venue.name}`)}`}
                    className="text-[#3db8a0] hover:underline font-medium"
                  >
                    {t("ownerContactLink")}
                  </Link>
                </p>
              </div>
            </div>
          ),

          /* ═══════ TAB: Pricing ═══════ */
          pricing: (
            <div className="space-y-4">
              {visiblePriceFields.length > 0 ? (() => {
                // Group fields by category
                const groups: { key: string; label: string; color: string; fields: typeof visiblePriceFields }[] = []
                const seen = new Set<string>()
                for (const f of visiblePriceFields) {
                  if (!seen.has(f.group)) {
                    seen.add(f.group)
                    const sep = GROUP_SEPARATORS[f.group]
                    groups.push({ key: f.group, label: sep?.label ?? f.group, color: sep?.color ?? "#888", fields: [] })
                  }
                  groups.find(g => g.key === f.group)!.fields.push(f)
                }
                // Column count: ≤3 groups → that many cols, 4+ → 2 cols
                const cols = groups.length <= 3 ? groups.length : groups.length % 3 === 0 ? 3 : 2
                const gridClass = cols === 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : ""
                return (
                  <div className={`grid grid-cols-1 ${gridClass} gap-4`}>
                    {groups.map(g => (
                      <div key={g.key} className="rounded-2xl border satine-border bg-card p-5 md:p-4">
                        <h3 className="font-semibold flex items-center justify-center gap-2 mb-3 text-sm" style={{ color: g.color }}>
                          {g.label}
                        </h3>
                        <div className="space-y-1.5">
                          {g.fields.map(field => renderPriceRow(field))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })() : (
                <div className="text-center py-12 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                  No pricing information available yet.
                </div>
              )}
            </div>
          ),

          /* ═══════ TAB: Gallery ═══════ */
          gallery: (
            <div id="gallery-section" className="space-y-4">
              {(venue.imageUrl || (venue.media && venue.media.length > 0)) ? (
                <div className="rounded-2xl border satine-border bg-card p-5 md:p-4">
                  <VenueMediaGallery media={venue.media || []} coverImage={venue.imageUrl || undefined} />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                  No photos yet.
                </div>
              )}
              {venue.menuMedia && venue.menuMedia.length > 0 && (
                <div className="rounded-2xl border satine-border bg-card p-5 md:p-4">
                  <VenueMenuGallery menuMedia={venue.menuMedia} />
                </div>
              )}
            </div>
          ),

          /* ═══════ TAB: Reviews ═══════ */
          reviews: (
            <div className="space-y-4">
              {/* Ratings - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 items-start">
                {/* Left - Community score + criteria */}
                <div className="rounded-2xl border satine-border bg-card p-5 md:p-4 flex flex-col items-center">
                  {displayRatingCount > 0 && displayAvgRating ? (
                    <>
                      {/* Big stars + score on same line */}
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => {
                            const full = displayAvgRating >= s
                            const half = !full && displayAvgRating >= s - 0.5
                            return (
                              <div key={s} className="relative h-8 w-8 md:h-6 md:w-6">
                                {half && (
                                  <Star className="absolute inset-0 h-8 w-8 md:h-6 md:w-6 fill-[#facc15] text-[#facc15]" style={{ clipPath: "inset(0 50% 0 0)" }} />
                                )}
                                <Star className={`h-8 w-8 md:h-6 md:w-6 ${full ? "fill-[#facc15] text-[#facc15]" : half ? "fill-transparent text-[#facc15]" : "fill-transparent text-[#6B7280]"}`} />
                              </div>
                            )
                          })}
                        </div>
                        <span className="text-5xl md:text-3xl font-bold text-foreground">{displayAvgRating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">{displayRatingCount} {displayRatingCount !== 1 ? t("ratings") : t("rating")}</p>
                      {/* Criteria bars */}
                      {Object.keys(allCriteriaAvgs).length > 0 && (
                        <div className="w-full space-y-2">
                          {criteria.map(c => allCriteriaAvgs[c.key] ? (
                            <RatingRow key={c.key} label={c.label} value={allCriteriaAvgs[c.key]} />
                          ) : null)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <Star className="h-8 w-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
                    </div>
                  )}
                </div>

                {/* Right - Your vote + scrollable individual reviews */}
                <div className="rounded-2xl border satine-border bg-card overflow-hidden flex flex-col">
                  {/* Your vote at top */}
                  <div className="px-5 py-3 border-b satine-border shrink-0">
                    <VenueRatingForm
                      venueId={venue.id}
                      venueSlug={venue.slug}
                      categorySlug={venue.category.slug}
                      criteria={criteria}
                      isAuthenticated={!!userId}
                      alreadyRated={alreadyRated}
                      initialScores={myRating?.scores}
                      initialOverall={myRating?.overall}
                      flat
                    />
                  </div>
                  {/* Individual reviews - scrollable */}
                  {venueRatings.length > 0 ? (
                    <div className="overflow-y-auto flex-1">
                      <VenueIndividualRatings
                        ratings={JSON.parse(JSON.stringify(venueRatings))}
                        criteria={criteria}
                        embedded
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground text-sm">
                      <p>{t("noReviews")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <VenueCommentSection
                venueId={venue.id}
                venueSlug={venue.slug}
                venueName={venue.name}
                comments={JSON.parse(JSON.stringify(venueComments))}
                currentUserId={userId}
                isAdmin={isAdmin}
              />

              {/* Community posts */}
              <div className="rounded-2xl border satine-border bg-card p-5 md:p-4 space-y-4 md:space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
                    {t("communityReviews")} ({venue._count.posts})
                  </h3>
                  <Button asChild size="sm">
                    <Link href={`/create?venue=${venue.id}`}>{t("review")}</Link>
                  </Button>
                </div>
                {venue.posts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                    {t("noReviews")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {venue.posts.map((post: any) => (
                      <PostCard key={post.id} post={post} isAuthenticated={!!userId} isAdmin={isAdmin} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        }}
      </VenueDetailTabs>

    </div>

    </>
  )
}
