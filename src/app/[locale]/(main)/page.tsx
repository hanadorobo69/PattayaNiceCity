import type { Metadata } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { prisma } from "@/lib/prisma"
import { placeholders as ph, qi, param } from "@/lib/db-utils"
import { buildWebPageJsonLd } from "@/lib/jsonld"
import { getCurrentUserId } from "@/lib/auth/session"
import { getTranslations, getLocale } from "next-intl/server"
import { SpotsContent, type LeanVenue, type LeanCategory } from "@/components/spots/spots-content"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
  description: "The #1 community guide to Pattaya. Find the best restaurants, beaches, temples, activities & family spots - ranked by real community ratings.",
  keywords: ["pattaya guide", "pattaya restaurants", "pattaya beaches", "pattaya activities", "pattaya family", "things to do pattaya", "pattaya temples", "pattaya food", "pattaya reviews", "best spots pattaya", "pattaya coworking", "pattaya markets"],
  openGraph: {
    title: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
    description: "Find the best restaurants, beaches, activities and spots in Pattaya - ranked by real community reviews.",
    type: "website",
  },
}

const NEW_VENUE_DAYS = 45
const POST_ONLY_SLUGS = new Set(["general", "events", "promo-deals", "qna", "lost-found", "administration"])

/**
 * Fetch ALL active venues with stats - called once, cached by ISR.
 * No category filter here; filtering is done client-side for instant UX.
 */
async function getVenuesWithStats(): Promise<LeanVenue[]> {
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    include: {
      category: true,
      _count: { select: { posts: { where: { deletedAt: null } }, venueComments: { where: { deletedAt: null } } } },
    },
  })

  const venueIds = venues.map(v => v.id)

  // Fetch extended fields in a single raw query
  const extFieldsMap: Record<string, any> = {}
  if (venueIds.length > 0) {
    const phs = ph(venueIds.length)
    const cols = ["id","priceSoftDrink","priceBeerMin","priceBeerMax","priceAlcoholMin","priceAlcoholMax",
      "priceLadyDrink","priceBottleMin","priceBottleMax",
      "priceBarfineMin","priceBarfineMax","priceShortTimeMin","priceShortTimeMax","priceLongTimeMin","priceLongTimeMax",
      "priceRoomSmall","priceRoomLarge","priceBJ","priceBoomBoom","priceTableSmall",
      "priceTableMedium","priceTableLarge","priceThaiMassage","priceFootMassage","priceOilMassage",
      "priceCoffeeMin","priceCoffeeMax","priceFoodMin","priceFoodMax","hotelStars",
      "hasPool","poolCount","hasDarts","dartsCount","hasConnect4","connect4Count",
      "hasCardGames","hasJenga","hasBeerPong","hasConsoles","hasBoardGames","hasWifi","hasTV",
      "isKidFriendly","isWheelchairFriendly","isRainyDayFriendly","hasParking","goodForDigitalNomad","petFriendly","goodForFamilies",
      "geometryType","geometryPath","areaRadius","widthHintMeters","zoneType","bestHours",
      "typicalBudgetMin","typicalBudgetMax","crowdStyle","safetyNote","nearbyHotels"].map(qi).join(", ")
    const extRows = await prisma.$queryRawUnsafe(
      `SELECT ${cols} FROM ${qi("Venue")} WHERE ${qi("id")} IN (${phs})`,
      ...venueIds
    ) as any[]
    for (const row of extRows) extFieldsMap[row.id] = row
  }

  // Fetch all ratings in batch
  const allVenueRatings = await prisma.venueRating.findMany({
    where: { venueId: { in: venueIds } },
    select: { venueId: true, overall: true },
  })

  const ratingsByVenue: Record<string, number[]> = {}
  for (const r of allVenueRatings) {
    if (!ratingsByVenue[r.venueId]) ratingsByVenue[r.venueId] = []
    ratingsByVenue[r.venueId].push(r.overall)
  }

  const cutoff = new Date(Date.now() - NEW_VENUE_DAYS * 24 * 60 * 60 * 1000)

  return venues.map(venue => {
    const ratings = ratingsByVenue[venue.id] ?? []
    const ratingCount = ratings.length
    const avgRating = ratingCount > 0
      ? Number((ratings.reduce((s, r) => s + r, 0) / ratingCount).toFixed(1))
      : null

    const ext = extFieldsMap[venue.id] ?? {}

    return {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      district: venue.district,
      hours: venue.hours,
      priceRange: venue.priceRange,
      imageUrl: venue.imageUrl,
      lat: venue.lat,
      lng: venue.lng,
      isVerified: venue.isVerified,
      isRecommended: venue.isRecommended,
      needsVerification: venue.needsVerification,
      permanentlyClosed: venue.permanentlyClosed,
      isNew: venue.createdAt > cutoff,
      createdAt: venue.createdAt.toISOString(),
      category: {
        name: venue.category.name,
        slug: venue.category.slug,
        color: venue.category.color,
        icon: venue.category.icon,
      },
      avgRating,
      ratingCount,
      commentCount: venue._count.venueComments + venue._count.posts,
      // Extended fields (flattened)
      hasPool: !!ext.hasPool,
      hasDarts: !!ext.hasDarts,
      hasConnect4: !!ext.hasConnect4,
      hasCardGames: !!ext.hasCardGames,
      hasJenga: !!ext.hasJenga,
      hasBeerPong: !!ext.hasBeerPong,
      hasConsoles: !!ext.hasConsoles,
      hasBoardGames: !!ext.hasBoardGames,
      hasWifi: !!ext.hasWifi,
      hasTV: !!ext.hasTV,
      // NiceCity flags
      isKidFriendly: !!ext.isKidFriendly,
      isWheelchairFriendly: !!ext.isWheelchairFriendly,
      isRainyDayFriendly: !!ext.isRainyDayFriendly,
      hasParking: !!ext.hasParking,
      goodForDigitalNomad: !!ext.goodForDigitalNomad,
      petFriendly: !!ext.petFriendly,
      goodForFamilies: !!ext.goodForFamilies,
      priceSoftDrink: ext.priceSoftDrink ?? null,
      priceBeerMin: ext.priceBeerMin ?? null,
      priceAlcoholMin: ext.priceAlcoholMin ?? null,
      priceLadyDrink: ext.priceLadyDrink ?? null,
      priceBottleMin: ext.priceBottleMin ?? null,
      priceTableSmall: ext.priceTableSmall ?? null,
      priceTableMedium: ext.priceTableMedium ?? null,
      priceTableLarge: ext.priceTableLarge ?? null,
      priceBarfineMin: ext.priceBarfineMin ?? null,
      priceShortTimeMin: ext.priceShortTimeMin ?? null,
      priceLongTimeMin: ext.priceLongTimeMin ?? null,
      priceBJ: ext.priceBJ ?? null,
      priceBoomBoom: ext.priceBoomBoom ?? null,
      priceRoomSmall: ext.priceRoomSmall ?? null,
      priceRoomLarge: ext.priceRoomLarge ?? null,
      priceThaiMassage: ext.priceThaiMassage ?? null,
      priceFootMassage: ext.priceFootMassage ?? null,
      priceOilMassage: ext.priceOilMassage ?? null,
      priceCoffeeMin: ext.priceCoffeeMin ?? null,
      priceFoodMin: ext.priceFoodMin ?? null,
      geometryType: ext.geometryType ?? null,
      geometryPath: ext.geometryPath ?? null,
      areaRadius: ext.areaRadius ?? null,
      widthHintMeters: ext.widthHintMeters ?? null,
      zoneType: ext.zoneType ?? null,
      bestHours: ext.bestHours ?? null,
      typicalBudgetMin: ext.typicalBudgetMin ?? null,
      typicalBudgetMax: ext.typicalBudgetMax ?? null,
      crowdStyle: ext.crowdStyle ?? null,
      safetyNote: ext.safetyNote ?? null,
      nearbyHotels: ext.nearbyHotels ?? null,
    }
  })
}

export default async function HomePage() {
  const [venues, categoriesRaw, userId, adminFavs] = await Promise.all([
    getVenuesWithStats(),
    prisma.category.findMany({ select: { id: true, name: true, slug: true, color: true, icon: true, sortOrder: true, isAdminOnly: true, isPostOnly: true } }),
    getCurrentUserId(),
    prisma.venueFavorite.findMany({
      where: { user: { isAdmin: true } },
      select: { venueId: true },
    }),
  ])

  // User favorites + admin check
  let favoritedVenueIds: string[] = []
  let isAdmin = false
  if (userId) {
    const [favs, profile] = await Promise.all([
      prisma.venueFavorite.findMany({ where: { userId }, select: { venueId: true } }),
      prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    ])
    favoritedVenueIds = favs.map(f => f.venueId)
    isAdmin = profile?.isAdmin ?? false
  }

  const pvcPickIds = adminFavs.map(f => f.venueId)

  const categories: LeanCategory[] = categoriesRaw
    .filter((c: any) => !c.isPostOnly && !c.isAdminOnly)
    .sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
    .map(c => ({ id: c.id, name: c.name, slug: c.slug, color: c.color, icon: c.icon, sortOrder: c.sortOrder }))

  // JSON-LD for SEO (use top 10 rated venues)
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"
  const topVenues = [...venues].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 10)
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Pattaya Nice City",
      url: siteUrl,
      description: "The #1 community guide to Pattaya. Real ratings, real reviews, by real people.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Pattaya Nice City",
      url: siteUrl,
      logo: `${siteUrl}/logo_hot.jpg`,
      description: "Community-driven guide to Pattaya's best restaurants, beaches, activities and family spots.",
      sameAs: [],
    },
    buildWebPageJsonLd({
      title: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
      description: "The #1 community guide to Pattaya. Find the best restaurants, beaches, temples, activities & family spots - ranked by real community ratings.",
      url: siteUrl,
      siteUrl,
    }),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Best Spots in Pattaya",
      description: "Top-rated bars, clubs, and entertainment venues in Pattaya ranked by community reviews.",
      numberOfItems: topVenues.length,
      itemListElement: topVenues.map((venue, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "LocalBusiness",
          name: venue.name,
          url: `${siteUrl}/places/${venue.slug}`,
          ...(venue.avgRating ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: venue.avgRating,
              ratingCount: venue.ratingCount,
              bestRating: 5,
              worstRating: 1,
            },
          } : {}),
        },
      })),
    },
  ]

  return (
    <>
      <Script id="home-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="min-h-screen" />}>
        <SpotsContent
          venues={venues}
          categories={categories}
          userId={userId ?? null}
          isAdmin={isAdmin}
          favoritedVenueIds={favoritedVenueIds}
          pvcPickIds={pvcPickIds}
          translations={{ spots: {}, categoryNames: {} }}
        />
      </Suspense>
    </>
  )
}
