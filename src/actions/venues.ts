"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import type { ActionResult } from "@/types"
import type { Venue, Category, VenueMedia, VenueMenuMedia } from "@prisma/client"
import { placeholders as ph, qi, param } from "@/lib/db-utils"

const EXTENDED_FIELDS = [
  "priceSoftDrink", "priceBeerMin", "priceBeerMax", "priceAlcoholMin", "priceAlcoholMax",
  "priceLadyDrink", "priceBottleMin", "priceBottleMax",
  "priceBarfineMin", "priceBarfineMax", "priceShortTimeMin", "priceShortTimeMax", "priceLongTimeMin", "priceLongTimeMax",
  "priceRoomSmall", "priceRoomLarge", "priceBJ", "priceBoomBoom",
  "priceTableSmall", "priceTableMedium", "priceTableLarge",
  "priceThaiMassage", "priceFootMassage", "priceOilMassage",
  "hotelStars",
  "priceCoffeeMin", "priceCoffeeMax", "priceFoodMin", "priceFoodMax",
  "hasPool", "poolCount", "hasDarts", "dartsCount",
  "hasConnect4", "connect4Count", "hasCardGames", "hasJenga", "hasBeerPong",
  "hasConsoles", "hasBoardGames", "hasWifi", "hasTV",
  "isKidFriendly", "isWheelchairFriendly", "isRainyDayFriendly", "hasParking", "goodForDigitalNomad", "petFriendly", "goodForFamilies",
  "geometryType", "geometryPath", "areaRadius", "widthHintMeters", "zoneType", "bestHours",
  "typicalBudgetMin", "typicalBudgetMax", "crowdStyle", "safetyNote", "nearbyHotels",
] as const

async function fetchExtendedFields(venueId: string): Promise<Record<string, any>> {
  const cols = EXTENDED_FIELDS.map(f => qi(f)).join(", ")
  const rows = await prisma.$queryRawUnsafe(`SELECT ${cols} FROM ${qi("Venue")} WHERE ${qi("id")} = ${param(1)}`, venueId) as any[]
  return rows[0] ?? {}
}

async function fetchExtendedFieldsBulk(venueIds: string[]): Promise<Record<string, Record<string, any>>> {
  if (venueIds.length === 0) return {}
  const phs = ph(venueIds.length)
  const cols = EXTENDED_FIELDS.map(f => qi(f)).join(", ")
  const rows = await prisma.$queryRawUnsafe(`SELECT ${qi("id")}, ${cols} FROM ${qi("Venue")} WHERE ${qi("id")} IN (${phs})`, ...venueIds) as any[]
  const map: Record<string, Record<string, any>> = {}
  for (const row of rows) map[row.id] = row
  return map
}

function optInt(fd: FormData, key: string, max = 1000000): number | null {
  const v = fd.get(key) as string
  if (!v || v === "") return null
  const n = parseInt(v, 10)
  return isNaN(n) || n < 0 || n > max ? null : n
}

function extractVenueFields(fd: FormData) {
  return {
    description: (fd.get("description") as string) || null,
    address: (fd.get("address") as string) || null,
    district: (fd.get("district") as string) || null,
    city: (fd.get("city") as string) || "Pattaya",
    phone: (() => { const p = (fd.get("phone") as string)?.trim(); return p ? (p.startsWith("+66") ? p : `+66 ${p}`) : null })(),
    phoneType: (fd.get("phoneType") as string) || null,
    whatsapp: (() => { const p = (fd.get("whatsapp") as string)?.trim(); return p ? (p.startsWith("+66") ? p : `+66 ${p}`) : null })(),
    lineId: (fd.get("lineId") as string) || null,
    lineQrUrl: (fd.get("lineQrUrl") as string) || null,
    website: (fd.get("website") as string) || null,
    facebook: (fd.get("facebook") as string) || null,
    instagram: (fd.get("instagram") as string) || null,
    hours: (fd.get("hours") as string) || null,
    imageUrl: (fd.get("imageUrl") as string) || null,
    priceRange: (fd.get("priceRange") as string) || null,
  }
}

function extractExtendedFields(fd: FormData) {
  return {
    priceSoftDrink: optInt(fd, "priceSoftDrink"),
    priceBeerMin: optInt(fd, "priceBeerMin"),
    priceBeerMax: optInt(fd, "priceBeerMax"),
    priceAlcoholMin: optInt(fd, "priceAlcoholMin"),
    priceAlcoholMax: optInt(fd, "priceAlcoholMax"),
    priceLadyDrink: optInt(fd, "priceLadyDrink"),
    priceBottleMin: optInt(fd, "priceBottleMin"),
    priceBottleMax: optInt(fd, "priceBottleMax"),
    priceBarfineMin: optInt(fd, "priceBarfineMin"),
    priceBarfineMax: optInt(fd, "priceBarfineMax"),
    priceShortTimeMin: optInt(fd, "priceShortTimeMin"),
    priceShortTimeMax: optInt(fd, "priceShortTimeMax"),
    priceLongTimeMin: optInt(fd, "priceLongTimeMin"),
    priceLongTimeMax: optInt(fd, "priceLongTimeMax"),
    priceRoomSmall: optInt(fd, "priceRoomSmall"),
    priceRoomLarge: optInt(fd, "priceRoomLarge"),
    priceBJ: optInt(fd, "priceBJ"),
    priceBoomBoom: optInt(fd, "priceBoomBoom"),
    priceTableSmall: optInt(fd, "priceTableSmall"),
    priceTableMedium: optInt(fd, "priceTableMedium"),
    priceTableLarge: optInt(fd, "priceTableLarge"),
    priceThaiMassage: optInt(fd, "priceThaiMassage"),
    priceFootMassage: optInt(fd, "priceFootMassage"),
    priceOilMassage: optInt(fd, "priceOilMassage"),
    priceCoffeeMin: optInt(fd, "priceCoffeeMin"),
    priceCoffeeMax: optInt(fd, "priceCoffeeMax"),
    priceFoodMin: optInt(fd, "priceFoodMin"),
    priceFoodMax: optInt(fd, "priceFoodMax"),
    hotelStars: optInt(fd, "hotelStars"),
    hasPool: fd.get("hasPool") === "on" ? 1 : 0,
    poolCount: optInt(fd, "poolCount"),
    hasDarts: fd.get("hasDarts") === "on" ? 1 : 0,
    dartsCount: optInt(fd, "dartsCount"),
    hasConnect4: fd.get("hasConnect4") === "on" ? 1 : 0,
    connect4Count: optInt(fd, "connect4Count"),
    hasCardGames: fd.get("hasCardGames") === "on" ? 1 : 0,
    hasJenga: fd.get("hasJenga") === "on" ? 1 : 0,
    hasBeerPong: fd.get("hasBeerPong") === "on" ? 1 : 0,
    hasConsoles: fd.get("hasConsoles") === "on" ? 1 : 0,
    hasBoardGames: fd.get("hasBoardGames") === "on" ? 1 : 0,
    hasWifi: fd.get("hasWifi") === "on" ? 1 : 0,
    hasTV: fd.get("hasTV") === "on" ? 1 : 0,
    isKidFriendly: fd.get("isKidFriendly") === "on" ? 1 : 0,
    isWheelchairFriendly: fd.get("isWheelchairFriendly") === "on" ? 1 : 0,
    isRainyDayFriendly: fd.get("isRainyDayFriendly") === "on" ? 1 : 0,
    hasParking: fd.get("hasParking") === "on" ? 1 : 0,
    goodForDigitalNomad: fd.get("goodForDigitalNomad") === "on" ? 1 : 0,
    petFriendly: fd.get("petFriendly") === "on" ? 1 : 0,
    goodForFamilies: fd.get("goodForFamilies") === "on" ? 1 : 0,
    geometryType: (fd.get("geometryType") as string) || null,
    geometryPath: (fd.get("geometryPath") as string) || null,
    areaRadius: optInt(fd, "areaRadius", 5000),
    widthHintMeters: optInt(fd, "widthHintMeters", 500),
    zoneType: (fd.get("zoneType") as string) || null,
    bestHours: (fd.get("bestHours") as string) || null,
    typicalBudgetMin: optInt(fd, "typicalBudgetMin"),
    typicalBudgetMax: optInt(fd, "typicalBudgetMax"),
    crowdStyle: (fd.get("crowdStyle") as string) || null,
    safetyNote: (fd.get("safetyNote") as string) || null,
    nearbyHotels: (fd.get("nearbyHotels") as string) || null,
  }
}

const BOOLEAN_FIELDS = new Set(["hasPool", "hasDarts", "hasConnect4", "hasCardGames", "hasJenga", "hasBeerPong", "hasConsoles", "hasBoardGames", "hasWifi", "hasTV", "isKidFriendly", "isWheelchairFriendly", "isRainyDayFriendly", "hasParking", "goodForDigitalNomad", "petFriendly", "goodForFamilies"])

async function updateExtendedFields(venueId: string, fields: ReturnType<typeof extractExtendedFields>) {
  // Build parameterized SET clauses to avoid SQL injection
  const entries = Object.entries(fields)
  const params: any[] = []
  let paramIdx = 1
  const sets = entries.map(([k, v]) => {
    if (v === null) return `${qi(k)} = NULL`
    if (BOOLEAN_FIELDS.has(k)) return `${qi(k)} = ${v ? "TRUE" : "FALSE"}`
    params.push(v)
    return `${qi(k)} = ${param(paramIdx++)}`
  }).join(", ")
  params.push(venueId)
  await prisma.$executeRawUnsafe(`UPDATE ${qi("Venue")} SET ${sets} WHERE ${qi("id")} = ${param(paramIdx)}`, ...params)
}

function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
}

export async function createVenueAdmin(formData: FormData): Promise<ActionResult<Venue>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  const name = formData.get("name") as string
  if (!name?.trim()) return { success: false, error: "Name is required" }

  // Check for duplicate name (case-insensitive)
  const existing = await prisma.venue.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true, name: true },
  })
  if (existing) return { success: false, error: `A spot named "${existing.name}" already exists` }

  const categoryId = formData.get("categoryId") as string
  if (!categoryId) return { success: false, error: "Category is required" }

  const baseSlug = makeSlug(name)
  let slug = baseSlug
  let counter = 1
  while (await prisma.venue.findUnique({ where: { slug } })) slug = `${baseSlug}-${counter++}`

  const lat = parseFloat(formData.get("lat") as string)
  const lng = parseFloat(formData.get("lng") as string)

  try {
    const venue = await prisma.venue.create({
      data: {
        name: name.trim(),
        slug,
        ...extractVenueFields(formData),
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng,
        categoryId,
        isVerified: formData.get("isVerified") === "on",
        isActive: formData.get("isActive") === "on",
        permanentlyClosed: formData.get("permanentlyClosed") === "on",
        isRecommended: formData.get("isRecommended") === "on",
      },
    })
    await updateExtendedFields(venue.id, extractExtendedFields(formData))

    // Create additional media entries (photos beyond the cover image) with order
    const additionalMediaRaw = formData.get("additionalMedia") as string
    if (additionalMediaRaw) {
      try {
        const additionalMedia = JSON.parse(additionalMediaRaw) as { url: string; type: string }[]
        for (let i = 0; i < additionalMedia.length; i++) {
          await prisma.venueMedia.create({
            data: { venueId: venue.id, url: additionalMedia[i].url, type: additionalMedia[i].type === "VIDEO" ? "VIDEO" : "IMAGE", order: i },
          })
        }
      } catch {}
    }

    revalidatePath("/")
    revalidatePath("/admin/venues")
    return { success: true, data: venue }
  } catch (error) {
    return { success: false, error: safeError("Failed to create spot", error) }
  }
}

export async function updateVenueAdmin(id: string, formData: FormData): Promise<ActionResult<Venue>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  const venue = await prisma.venue.findUnique({ where: { id } })
  if (!venue) return { success: false, error: "Spot not found" }

  const name = formData.get("name") as string
  if (!name?.trim()) return { success: false, error: "Name is required" }
  const categoryId = formData.get("categoryId") as string
  if (!categoryId) return { success: false, error: "Category is required" }

  // Re-slug if name changed
  let slug = venue.slug
  if (name.trim() !== venue.name) {
    const baseSlug = makeSlug(name)
    slug = baseSlug
    let counter = 1
    while (await prisma.venue.findFirst({ where: { slug, NOT: { id } } })) slug = `${baseSlug}-${counter++}`
  }

  const lat = parseFloat(formData.get("lat") as string)
  const lng = parseFloat(formData.get("lng") as string)

  try {
    const updated = await prisma.venue.update({
      where: { id },
      data: {
        name: name.trim(),
        slug,
        ...extractVenueFields(formData),
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng,
        categoryId,
        isVerified: formData.get("isVerified") === "on",
        isActive: formData.get("isActive") === "on",
        permanentlyClosed: formData.get("permanentlyClosed") === "on",
        isRecommended: formData.get("isRecommended") === "on",
      },
    })
    await updateExtendedFields(id, extractExtendedFields(formData))

    // Sync media: delete all existing, recreate with correct order
    const additionalMediaRaw = formData.get("additionalMedia") as string
    if (additionalMediaRaw) {
      try {
        const additionalMedia = JSON.parse(additionalMediaRaw) as { url: string; type: string }[]
        await prisma.venueMedia.deleteMany({ where: { venueId: id } })
        for (let i = 0; i < additionalMedia.length; i++) {
          await prisma.venueMedia.create({
            data: { venueId: id, url: additionalMedia[i].url, type: additionalMedia[i].type === "VIDEO" ? "VIDEO" : "IMAGE", order: i },
          })
        }
      } catch {}
    }

    revalidatePath("/")
    revalidatePath(`/places/${updated.slug}`)
    revalidatePath("/admin/venues")
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: safeError("Failed to update spot", error) }
  }
}

export async function searchVenues(q: string): Promise<ActionResult<{ slug: string; name: string; category: { name: string; icon: string | null } }[]>> {
  try {
    // Expand query for letter-digit boundary variations: "soi6" -> also "soi 6"
    const withSpaces = q.replace(/([a-z])(\d)/gi, "$1 $2").replace(/(\d)([a-z])/gi, "$1 $2")
    const collapsed = q.replace(/([a-z])\s+(\d)/gi, "$1$2").replace(/(\d)\s+([a-z])/gi, "$1$2")
    const variants = [...new Set([q, withSpaces, collapsed])]
    const orConditions = variants.flatMap((v) => [
      { name: { contains: v, mode: "insensitive" as const } },
      { slug: { contains: v, mode: "insensitive" as const } },
      { category: { name: { contains: v, mode: "insensitive" as const } } },
    ])
    const venues = await prisma.venue.findMany({
      where: { isActive: true, OR: orConditions },
      include: { category: { select: { name: true, icon: true } } },
      take: 8,
    })
    return { success: true, data: venues.map(v => ({ slug: v.slug, name: v.name, category: v.category })) }
  } catch {
    return { success: false, error: "Search failed" }
  }
}

export async function toggleNeedsVerification(venueId: string): Promise<ActionResult<boolean>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { needsVerification: true } })
    if (!venue) return { success: false, error: "Venue not found" }

    const updated = await prisma.venue.update({
      where: { id: venueId },
      data: { needsVerification: !venue.needsVerification },
      select: { needsVerification: true },
    })
    revalidatePath("/")
    return { success: true, data: updated.needsVerification }
  } catch (error) {
    return { success: false, error: safeError("Failed to toggle verification flag", error) }
  }
}

export type VenueWithDetails = Venue & {
  category: Category
  _count: { posts: number }
  avgRating?: number | null
  ratingCount?: number
  media?: VenueMedia[]
  menuMedia?: VenueMenuMedia[]
}

export async function getVenues(categorySlug?: string): Promise<ActionResult<VenueWithDetails[]>> {
  try {
    const venues = await prisma.venue.findMany({
      where: {
        isActive: true,
        ...(categorySlug && categorySlug !== "all" ? { category: { slug: categorySlug } } : {}),
      },
      include: {
        category: true,
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Batch: compute avg ratings for ALL venues in 1 query instead of N+1
    const venueIds = venues.map(v => v.id)
    const allRatings = venueIds.length > 0
      ? await prisma.rating.findMany({
          where: { post: { venueId: { in: venueIds } } },
          select: { overall: true, post: { select: { venueId: true } } },
        })
      : []

    // Group ratings by venueId
    const ratingsByVenue = new Map<string, number[]>()
    for (const r of allRatings) {
      const vid = r.post.venueId
      if (!vid) continue
      if (!ratingsByVenue.has(vid)) ratingsByVenue.set(vid, [])
      ratingsByVenue.get(vid)!.push(r.overall)
    }

    const venuesWithRatings = venues.map(venue => {
      const ratings = ratingsByVenue.get(venue.id) ?? []
      const count = ratings.length
      const avg = count > 0
        ? Number((ratings.reduce((s, v) => s + v, 0) / count).toFixed(1))
        : null
      return { ...venue, avgRating: avg, ratingCount: count }
    })

    // Sort by avgRating desc
    venuesWithRatings.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))

    return { success: true, data: venuesWithRatings }
  } catch (error) {
    return { success: false, error: safeError("Failed to load spots", error) }
  }
}

export async function getVenueBySlug(slug: string): Promise<ActionResult<VenueWithDetails & { posts: any[] }>> {
  try {
    const venue = await prisma.venue.findUnique({
      where: { slug },
      include: {
        category: true,
        _count: { select: { posts: { where: { deletedAt: null } } } },
        media: { orderBy: { order: "asc" } },
        menuMedia: { orderBy: { order: "asc" } },
        posts: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
            category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
            ratings: { select: { overall: true } },
            _count: { select: { comments: { where: { deletedAt: null } }, votes: true, ratings: true } },
          },
          orderBy: { score: "desc" },
          take: 10,
        },
      },
    })

    if (!venue) return { success: false, error: "Spot not found" }

    const [allRatings, extFields] = await Promise.all([
      prisma.rating.findMany({
        where: { post: { venueId: venue.id } },
        select: { overall: true },
      }),
      fetchExtendedFields(venue.id),
    ])
    const ratingCount = allRatings.length
    const avgRating = ratingCount > 0
      ? Number((allRatings.reduce((s, r) => s + r.overall, 0) / ratingCount).toFixed(1))
      : null

    return { success: true, data: { ...venue, ...extFields, avgRating, ratingCount } }
  } catch (error) {
    return { success: false, error: safeError("Failed to load spot", error) }
  }
}

export async function addVenueMedia(venueId: string, item: { url: string; type: string; filename?: string; caption?: string }): Promise<ActionResult<VenueMedia>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    const maxOrder = await prisma.venueMedia.aggregate({ where: { venueId }, _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1
    const media = await prisma.venueMedia.create({
      data: { venueId, url: item.url, type: item.type, caption: item.caption ?? null, order: nextOrder },
    })
    revalidatePath(`/places`)
    revalidatePath(`/admin/venues`)
    return { success: true, data: media }
  } catch (error) {
    return { success: false, error: safeError("Failed to add media", error) }
  }
}

export async function deleteVenueMedia(mediaId: string, venueSlug: string): Promise<ActionResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    await prisma.venueMedia.delete({ where: { id: mediaId } })
    revalidatePath(`/places/${venueSlug}`)
    revalidatePath(`/admin/venues`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete media", error) }
  }
}

export async function reorderVenueMedia(venueId: string, orderedIds: string[]): Promise<ActionResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    await prisma.$transaction(
      orderedIds.map((id, i) => prisma.venueMedia.update({ where: { id }, data: { order: i } }))
    )
    revalidatePath(`/places`)
    revalidatePath(`/admin/venues`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to reorder media", error) }
  }
}

export async function addVenueMenuMedia(venueId: string, item: { url: string }): Promise<ActionResult<VenueMenuMedia>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    const maxOrder = await prisma.venueMenuMedia.aggregate({ where: { venueId }, _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1
    const media = await prisma.venueMenuMedia.create({
      data: { venueId, url: item.url, order: nextOrder },
    })
    revalidatePath(`/places`)
    revalidatePath(`/admin/venues`)
    return { success: true, data: media }
  } catch (error) {
    return { success: false, error: safeError("Failed to add menu image", error) }
  }
}

export async function deleteVenueMenuMedia(mediaId: string, venueSlug: string): Promise<ActionResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    await prisma.venueMenuMedia.delete({ where: { id: mediaId } })
    revalidatePath(`/places/${venueSlug}`)
    revalidatePath(`/admin/venues`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete menu image", error) }
  }
}

export async function deleteVenue(venueId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }

  try {
    await prisma.venue.delete({ where: { id: venueId } })
    revalidatePath("/")
    revalidatePath("/admin/venues")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete spot", error) }
  }
}
