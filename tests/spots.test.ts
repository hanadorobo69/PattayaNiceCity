/**
 * Integration tests for spot CRUD operations.
 *
 * Uses a separate PostgreSQL database (pattayavicecity_test) — never touches production.
 * Tests every category with its relevant fields (pricing, games, hotel).
 * Validates create, read, update, extended fields (raw SQL), and delete.
 *
 * Run: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { setupTestDb, teardownTestDb, SPOT_CATEGORIES } from "./setup"
import type { PrismaClient } from "@prisma/client"

let prisma: PrismaClient

// ── Category → field mapping (mirrors venue-form.tsx logic) ──

const MASSAGE_SLUGS = new Set(["massage", "ladyboy-massage", "gay-massage"])
const CLUB_SLUGS = new Set(["club", "gay-club", "ladyboy-club"])
const BJ_SLUGS = new Set(["bj-bar"])
const GOGO_SLUGS = new Set(["gogo-bar", "russian-gogo", "gay-gogo", "ladyboy-gogo"])
const GENTLEMANS_SLUGS = new Set(["gentlemans-club"])
const GIRLY_BAR_SLUGS = new Set(["girly-bar", "gay-bar", "ladyboy-bar"])
const NORMAL_BAR_SLUGS = new Set(["bar"])
const KTV_SLUGS = new Set(["ktv"])
const HOTEL_SLUGS = new Set(["short-time-hotel"])
const HAS_GAMES_SLUGS = new Set([
  "bar", "girly-bar", "ktv", "gentlemans-club", "bj-bar",
  "gay-bar", "ladyboy-bar",
])

type PriceGroup = "drinks" | "ladyDrink" | "bottle" | "clubTables" | "barfine" | "shortLong" | "room" | "bj" | "boomBoom" | "massage"

function getVisibleGroups(slug: string): Set<PriceGroup> {
  if (MASSAGE_SLUGS.has(slug)) return new Set(["massage", "bj", "boomBoom"])
  if (CLUB_SLUGS.has(slug)) return new Set(["drinks", "bottle", "clubTables"])
  if (BJ_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (GOGO_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong"])
  if (GENTLEMANS_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "clubTables", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (GIRLY_BAR_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "barfine", "shortLong", "room", "bj", "boomBoom"])
  if (NORMAL_BAR_SLUGS.has(slug)) return new Set(["drinks", "bottle"])
  if (KTV_SLUGS.has(slug)) return new Set(["drinks", "ladyDrink", "bottle", "barfine", "room", "bj", "boomBoom"])
  if (HOTEL_SLUGS.has(slug)) return new Set(["shortLong"])
  // Community-only categories have no venue pricing
  return new Set(["drinks"])
}

// Build pricing data based on category
function buildPricingData(slug: string): Record<string, number> {
  const groups = getVisibleGroups(slug)
  const data: Record<string, number> = {}
  if (groups.has("drinks")) Object.assign(data, { priceSoftDrink: 60, priceBeerMin: 80, priceBeerMax: 120, priceAlcoholMin: 100, priceAlcoholMax: 250 })
  if (groups.has("ladyDrink")) data.priceLadyDrink = 180
  if (groups.has("bottle")) Object.assign(data, { priceBottleMin: 2000, priceBottleMax: 10000 })
  if (groups.has("clubTables")) Object.assign(data, { priceTableSmall: 1000, priceTableMedium: 3000, priceTableLarge: 5000 })
  if (groups.has("barfine")) Object.assign(data, { priceBarfineMin: 1000, priceBarfineMax: 2000 })
  if (groups.has("shortLong")) Object.assign(data, { priceShortTimeMin: 2000, priceShortTimeMax: 3000, priceLongTimeMin: 4000, priceLongTimeMax: 6000 })
  if (groups.has("room")) Object.assign(data, { priceRoomSmall: 500, priceRoomLarge: 1000 })
  if (groups.has("bj")) data.priceBJ = 1500
  if (groups.has("boomBoom")) data.priceBoomBoom = 2500
  if (groups.has("massage")) Object.assign(data, { priceThaiMassage: 300, priceFootMassage: 300, priceOilMassage: 500 })
  return data
}

function buildGamesData(slug: string): Record<string, number> {
  if (!HAS_GAMES_SLUGS.has(slug)) return {}
  return { hasPool: 1, poolCount: 2, hasDarts: 1, dartsCount: 3, hasConnect4: 1, connect4Count: 1, hasCardGames: 1, hasJenga: 1, hasBeerPong: 1 }
}

function buildHotelData(slug: string): Record<string, number> {
  if (!HOTEL_SLUGS.has(slug)) return {}
  return { hotelStars: 3 }
}

// ── Raw SQL helpers (PostgreSQL — quoted identifiers, $1 params) ──

const ALL_EXTENDED_FIELDS = [
  "priceSoftDrink", "priceBeerMin", "priceBeerMax", "priceAlcoholMin", "priceAlcoholMax",
  "priceLadyDrink", "priceBottleMin", "priceBottleMax",
  "priceBarfineMin", "priceBarfineMax", "priceShortTimeMin", "priceShortTimeMax", "priceLongTimeMin", "priceLongTimeMax",
  "priceRoomSmall", "priceRoomLarge", "priceBJ", "priceBoomBoom",
  "priceTableSmall", "priceTableMedium", "priceTableLarge",
  "priceThaiMassage", "priceFootMassage", "priceOilMassage", "hotelStars",
  "hasPool", "poolCount", "hasDarts", "dartsCount",
  "hasConnect4", "connect4Count", "hasCardGames", "hasJenga", "hasBeerPong",
]

const BOOLEAN_FIELDS = new Set(["hasPool", "hasDarts", "hasConnect4", "hasCardGames", "hasJenga", "hasBeerPong"])

async function updateExtendedFields(venueId: string, fields: Record<string, number | boolean | null>) {
  const sets = Object.entries(fields)
    .map(([k, v]) => {
      if (v === null) {
        // Boolean columns are NOT NULL with default false — use FALSE instead of NULL
        if (BOOLEAN_FIELDS.has(k)) return `"${k}" = FALSE`
        return `"${k}" = NULL`
      }
      if (BOOLEAN_FIELDS.has(k)) return `"${k}" = ${v ? "TRUE" : "FALSE"}`
      return `"${k}" = ${v}`
    })
    .join(", ")
  await prisma.$executeRawUnsafe(`UPDATE "Venue" SET ${sets} WHERE "id" = '${venueId}'`)
}

async function fetchExtendedFields(venueId: string): Promise<Record<string, any>> {
  const cols = ALL_EXTENDED_FIELDS.map(f => `"${f}"`).join(", ")
  const rows = await prisma.$queryRawUnsafe(`SELECT ${cols} FROM "Venue" WHERE "id" = $1`, venueId) as any[]
  return rows[0] ?? {}
}

// ── Tests ──

beforeAll(async () => {
  prisma = await setupTestDb()
}, 60000)

afterAll(async () => {
  await teardownTestDb()
}, 30000)

describe("Spot CRUD — all 17 categories", () => {
  const createdIds: string[] = []

  for (const cat of SPOT_CATEGORIES) {
    describe(`${cat.icon} ${cat.name} (${cat.slug})`, () => {
      let venueId: string

      it("create spot with basic fields", async () => {
        const category = await prisma.category.findUnique({ where: { slug: cat.slug } })
        expect(category).toBeTruthy()

        const venue = await prisma.venue.create({
          data: {
            name: `Test ${cat.name}`,
            slug: `test-${cat.slug}`,
            categoryId: category!.id,
            description: `A test ${cat.name} spot`,
            address: "123 Test Street",
            district: "Walking Street",
            city: "Pattaya",
            lat: 12.925,
            lng: 100.877,
            isActive: true,
            isVerified: true,
            priceRange: "$$",
          },
        })

        expect(venue.id).toBeTruthy()
        expect(venue.name).toBe(`Test ${cat.name}`)
        expect(venue.slug).toBe(`test-${cat.slug}`)
        venueId = venue.id
        createdIds.push(venueId)
      })

      it("write extended fields via raw SQL", async () => {
        const pricing = buildPricingData(cat.slug)
        const games = buildGamesData(cat.slug)
        const hotel = buildHotelData(cat.slug)
        const allData = { ...pricing, ...games, ...hotel }

        // Build complete field set with nulls for unused fields
        const complete: Record<string, number | null> = {}
        for (const f of ALL_EXTENDED_FIELDS) complete[f] = allData[f] ?? null

        await updateExtendedFields(venueId, complete)

        // Verify
        const stored = await fetchExtendedFields(venueId)
        for (const [key, val] of Object.entries(pricing)) expect(stored[key]).toBe(val)
        for (const [key, val] of Object.entries(games)) {
          // Booleans come back as true/false from PostgreSQL, not 1/0
          if (BOOLEAN_FIELDS.has(key)) {
            expect(stored[key]).toBe(!!val)
          } else {
            expect(stored[key]).toBe(val)
          }
        }
        for (const [key, val] of Object.entries(hotel)) expect(stored[key]).toBe(val)
      })

      it("read back spot with category", async () => {
        const venue = await prisma.venue.findUnique({
          where: { id: venueId },
          include: { category: true },
        })
        expect(venue).toBeTruthy()
        expect(venue!.category.slug).toBe(cat.slug)
        expect(venue!.isActive).toBe(true)
      })

      it("update basic fields", async () => {
        const updated = await prisma.venue.update({
          where: { id: venueId },
          data: { name: `Updated ${cat.name}`, priceRange: "$$$" },
        })
        expect(updated.name).toBe(`Updated ${cat.name}`)
        expect(updated.priceRange).toBe("$$$")
      })

      it("partial update of extended fields", async () => {
        const groups = getVisibleGroups(cat.slug)
        const field = groups.has("drinks") ? "priceBeerMax"
          : groups.has("massage") ? "priceFootMassage"
          : groups.has("shortLong") ? "priceShortTimeMin"
          : groups.has("clubTables") ? "priceTableSmall"
          : null

        if (field) {
          await updateExtendedFields(venueId, { [field]: 9999 })
          const stored = await fetchExtendedFields(venueId)
          expect(stored[field]).toBe(9999)
        }
      })
    })
  }

  it("delete all test spots", async () => {
    for (const id of createdIds) {
      await prisma.venue.delete({ where: { id } })
      const deleted = await prisma.venue.findUnique({ where: { id } })
      expect(deleted).toBeNull()
    }
  })
})

describe("Edge cases", () => {
  let categoryId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    categoryId = cat!.id
  })

  it("minimal spot (only required fields)", async () => {
    const venue = await prisma.venue.create({
      data: { name: "Minimal Spot", slug: "minimal-spot", categoryId },
    })
    expect(venue.description).toBeNull()
    expect(venue.address).toBeNull()
    expect(venue.lat).toBeNull()
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("spot with ALL fields populated", async () => {
    const venue = await prisma.venue.create({
      data: {
        name: "Full Spot", slug: "full-spot", categoryId,
        description: "Full description",
        address: "456 Full Street", district: "Soi 6", city: "Pattaya",
        phone: "+66381234567", phoneType: "whatsapp",
        whatsapp: "+66812345678", lineId: "@fullspot",
        lineQrUrl: "https://qr.line.me/test", website: "https://fullspot.com",
        hours: '{"Mon":{"open":"19:00","close":"03:00","closed":false}}',
        imageUrl: "https://example.com/image.jpg",
        lat: 12.93, lng: 100.88,
        isVerified: true, isActive: true, priceRange: "$$$",
      },
    })

    const allFields: Record<string, number> = {
      priceSoftDrink: 60, priceBeerMin: 80, priceBeerMax: 150,
      priceAlcoholMin: 120, priceAlcoholMax: 300,
      priceLadyDrink: 200, priceBottleMin: 2500, priceBottleMax: 12000,
      priceBarfineMin: 1000, priceBarfineMax: 2000, priceShortTimeMin: 2000, priceShortTimeMax: 3000, priceLongTimeMin: 4000, priceLongTimeMax: 6000,
      priceRoomSmall: 600, priceRoomLarge: 1200,
      priceBJ: 1800, priceBoomBoom: 3000,
      priceTableSmall: 1200, priceTableMedium: 3500, priceTableLarge: 6000,
      priceThaiMassage: 300, priceFootMassage: 350, priceOilMassage: 600, hotelStars: 4,
      hasPool: 1, poolCount: 3, hasDarts: 1, dartsCount: 2,
      hasConnect4: 1, connect4Count: 1, hasCardGames: 1, hasJenga: 1, hasBeerPong: 1,
    }
    await updateExtendedFields(venue.id, allFields)
    const stored = await fetchExtendedFields(venue.id)
    for (const [key, val] of Object.entries(allFields)) {
      if (BOOLEAN_FIELDS.has(key)) {
        expect(stored[key]).toBe(!!val)
      } else {
        expect(stored[key]).toBe(val)
      }
    }

    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("slug uniqueness enforced", async () => {
    const v1 = await prisma.venue.create({ data: { name: "Dup", slug: "dup", categoryId } })
    await expect(
      prisma.venue.create({ data: { name: "Dup 2", slug: "dup", categoryId } })
    ).rejects.toThrow()
    const v2 = await prisma.venue.create({ data: { name: "Dup 2", slug: "dup-2", categoryId } })
    await prisma.venue.delete({ where: { id: v1.id } })
    await prisma.venue.delete({ where: { id: v2.id } })
  })

  it("duplicate spot name (case-insensitive) should be detectable", async () => {
    const v1 = await prisma.venue.create({
      data: { name: "Unique Bar", slug: "unique-bar", categoryId },
    })

    // Simulate the case-insensitive duplicate check used in createVenueAdmin
    const existing = await prisma.venue.findFirst({
      where: { name: { equals: "unique bar", mode: "insensitive" } },
      select: { id: true, name: true },
    })
    expect(existing).toBeTruthy()
    expect(existing!.name).toBe("Unique Bar")

    // Also check with different casing
    const existing2 = await prisma.venue.findFirst({
      where: { name: { equals: "UNIQUE BAR", mode: "insensitive" } },
      select: { id: true, name: true },
    })
    expect(existing2).toBeTruthy()
    expect(existing2!.id).toBe(v1.id)

    // Non-matching name should return null
    const noMatch = await prisma.venue.findFirst({
      where: { name: { equals: "Different Bar", mode: "insensitive" } },
      select: { id: true },
    })
    expect(noMatch).toBeNull()

    await prisma.venue.delete({ where: { id: v1.id } })
  })

  it("clear extended fields (set to NULL)", async () => {
    const venue = await prisma.venue.create({ data: { name: "Null Test", slug: "null-test", categoryId } })
    await updateExtendedFields(venue.id, { priceBeerMin: 100, priceBeerMax: 200 })
    let stored = await fetchExtendedFields(venue.id)
    expect(stored.priceBeerMin).toBe(100)

    await updateExtendedFields(venue.id, { priceBeerMin: null, priceBeerMax: null })
    stored = await fetchExtendedFields(venue.id)
    expect(stored.priceBeerMin).toBeNull()
    expect(stored.priceBeerMax).toBeNull()

    await prisma.venue.delete({ where: { id: venue.id } })
  })
})

describe("Venue ratings — half-star support", () => {
  let venueId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: { name: "Rating Test", slug: "rating-test", categoryId: cat!.id },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venueRating.deleteMany({ where: { venueId } })
    await prisma.venue.delete({ where: { id: venueId } })
  })

  for (const rating of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
    it(`accepts rating ${rating}`, async () => {
      expect((rating * 2) % 1).toBe(0) // valid 0.5 increment

      const r = await prisma.venueRating.upsert({
        where: { authorId_venueId: { authorId: "test-user-id", venueId } },
        create: { authorId: "test-user-id", venueId, overall: rating, scores: JSON.stringify({ atmosphere: rating }) },
        update: { overall: rating, scores: JSON.stringify({ atmosphere: rating }) },
      })
      expect(r.overall).toBe(rating)
    })
  }

  it("computes correct average with half-star values", async () => {
    await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: "test-admin-id", venueId } },
      create: { authorId: "test-admin-id", venueId, overall: 4.5, scores: "{}" },
      update: { overall: 4.5 },
    })
    await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: "test-user-id", venueId } },
      create: { authorId: "test-user-id", venueId, overall: 3.5, scores: "{}" },
      update: { overall: 3.5 },
    })

    const ratings = await prisma.venueRating.findMany({ where: { venueId } })
    const avg = ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length
    expect(avg).toBe(4) // (4.5 + 3.5) / 2
  })
})

describe("Category consistency", () => {
  it("all categories seeded", async () => {
    const categories = await prisma.category.findMany()
    expect(categories.length).toBe(SPOT_CATEGORIES.length)
    for (const expected of SPOT_CATEGORIES) {
      expect(categories.find(c => c.slug === expected.slug)).toBeTruthy()
    }
  })

  it("every category maps to valid price groups", () => {
    for (const cat of SPOT_CATEGORIES) {
      expect(getVisibleGroups(cat.slug).size).toBeGreaterThan(0)
    }
  })

  it("gogos have NO games", () => {
    for (const s of ["gogo-bar", "russian-gogo", "ladyboy-gogo", "gay-gogo"]) {
      expect(HAS_GAMES_SLUGS.has(s)).toBe(false)
    }
  })

  it("massage has NO games", () => {
    for (const s of ["massage", "ladyboy-massage", "gay-massage"]) {
      expect(HAS_GAMES_SLUGS.has(s)).toBe(false)
    }
  })

  it("hotel has NO games", () => {
    expect(HAS_GAMES_SLUGS.has("short-time-hotel")).toBe(false)
  })

  it("clubs have NO games", () => {
    for (const s of ["club", "gay-club", "ladyboy-club"]) {
      expect(HAS_GAMES_SLUGS.has(s)).toBe(false)
    }
  })

  it("bars/ktv HAVE games", () => {
    for (const s of ["bar", "ktv", "gentlemans-club", "bj-bar"]) {
      expect(HAS_GAMES_SLUGS.has(s)).toBe(true)
    }
  })

  it("gay/ladyboy bars HAVE games", () => {
    for (const s of ["gay-bar", "ladyboy-bar"]) {
      expect(HAS_GAMES_SLUGS.has(s)).toBe(true)
    }
  })

  it("community-only slugs are post-only (excluded from venue tabs)", () => {
    const POST_ONLY_SLUGS = new Set(["general", "events", "location-bike-car", "administration"])
    // These slugs exist as categories but are filtered out from venue tab display
    for (const slug of POST_ONLY_SLUGS) {
      const cat = SPOT_CATEGORIES.find(c => c.slug === slug)
      expect(cat).toBeTruthy()
      // They should NOT appear in any venue-specific slug set
      expect(MASSAGE_SLUGS.has(slug)).toBe(false)
      expect(CLUB_SLUGS.has(slug)).toBe(false)
      expect(GIRLY_BAR_SLUGS.has(slug)).toBe(false)
      expect(NORMAL_BAR_SLUGS.has(slug)).toBe(false)
      expect(GOGO_SLUGS.has(slug)).toBe(false)
      expect(KTV_SLUGS.has(slug)).toBe(false)
      expect(HOTEL_SLUGS.has(slug)).toBe(false)
      expect(HAS_GAMES_SLUGS.has(slug)).toBe(false)
    }
  })
})

describe("Input validation & boundary conditions", () => {
  let categoryId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    categoryId = cat!.id
  })

  it("venue with empty string fields stores them correctly", async () => {
    const venue = await prisma.venue.create({
      data: { name: "Empty Fields Test", slug: "empty-fields-test", categoryId, description: "", address: "", phone: "" },
    })
    expect(venue.description).toBe("")
    expect(venue.address).toBe("")
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("venue with very long name is stored", async () => {
    const longName = "A".repeat(255)
    const venue = await prisma.venue.create({
      data: { name: longName, slug: "long-name-test", categoryId },
    })
    expect(venue.name).toBe(longName)
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("venue coordinates at boundary values", async () => {
    const venue = await prisma.venue.create({
      data: { name: "Boundary Coords", slug: "boundary-coords", categoryId, lat: -90, lng: -180 },
    })
    expect(venue.lat).toBe(-90)
    expect(venue.lng).toBe(-180)
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("zero price fields are valid", async () => {
    const venue = await prisma.venue.create({ data: { name: "Zero Price", slug: "zero-price", categoryId } })
    await updateExtendedFields(venue.id, { priceBeerMin: 0, priceBeerMax: 0 })
    const stored = await fetchExtendedFields(venue.id)
    expect(stored.priceBeerMin).toBe(0)
    expect(stored.priceBeerMax).toBe(0)
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("large price values are stored correctly", async () => {
    const venue = await prisma.venue.create({ data: { name: "Big Price", slug: "big-price", categoryId } })
    await updateExtendedFields(venue.id, { priceBottleMax: 999999 })
    const stored = await fetchExtendedFields(venue.id)
    expect(stored.priceBottleMax).toBe(999999)
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("hotel stars must be reasonable values", async () => {
    const hotelCat = await prisma.category.findUnique({ where: { slug: "short-time-hotel" } })
    const venue = await prisma.venue.create({ data: { name: "Star Hotel", slug: "star-hotel", categoryId: hotelCat!.id } })
    for (const stars of [1, 2, 3, 4, 5]) {
      await updateExtendedFields(venue.id, { hotelStars: stars })
      const stored = await fetchExtendedFields(venue.id)
      expect(stored.hotelStars).toBe(stars)
    }
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("boolean amenity fields toggle correctly", async () => {
    const venue = await prisma.venue.create({ data: { name: "Toggle Amenities", slug: "toggle-amenities", categoryId } })
    await updateExtendedFields(venue.id, { hasPool: 1, hasDarts: 1, hasConnect4: 0 })
    let stored = await fetchExtendedFields(venue.id)
    expect(stored.hasPool).toBe(true)
    expect(stored.hasDarts).toBe(true)
    expect(stored.hasConnect4).toBe(false)

    // Toggle off
    await updateExtendedFields(venue.id, { hasPool: 0, hasDarts: 0 })
    stored = await fetchExtendedFields(venue.id)
    expect(stored.hasPool).toBe(false)
    expect(stored.hasDarts).toBe(false)

    await prisma.venue.delete({ where: { id: venue.id } })
  })
})


// ══════════════════════════════════════════════════════════════
// SEARCH — case-insensitive + category name matching
// ══════════════════════════════════════════════════════════════

describe("Venue search — case-insensitive + category", () => {
  let barCategoryId: string
  let massageCategoryId: string
  let venueIds: string[] = []

  beforeAll(async () => {
    const bar = await prisma.category.findUnique({ where: { slug: "bar" } })
    const massage = await prisma.category.findUnique({ where: { slug: "massage" } })
    barCategoryId = bar!.id
    massageCategoryId = massage!.id

    const v1 = await prisma.venue.create({
      data: { name: "Sunset GoGo", slug: "sunset-gogo-search", categoryId: barCategoryId, description: "Best gogo on walking street", isActive: true },
    })
    const v2 = await prisma.venue.create({
      data: { name: "Happy Massage", slug: "happy-massage-search", categoryId: massageCategoryId, description: "Traditional Thai", isActive: true },
    })
    const v3 = await prisma.venue.create({
      data: { name: "Neon Bar", slug: "neon-bar-search", categoryId: barCategoryId, description: "Cheap beers on Soi 6", isActive: true },
    })
    venueIds = [v1.id, v2.id, v3.id]
  })

  afterAll(async () => {
    for (const id of venueIds) await prisma.venue.delete({ where: { id } })
  })

  it("case-insensitive name search — lowercase query matches mixed-case name", async () => {
    const results = await prisma.venue.findMany({
      where: { isActive: true, name: { contains: "sunset", mode: "insensitive" } },
    })
    expect(results.some(v => v.name === "Sunset GoGo")).toBe(true)
  })

  it("case-insensitive name search — uppercase query matches", async () => {
    const results = await prisma.venue.findMany({
      where: { isActive: true, name: { contains: "NEON", mode: "insensitive" } },
    })
    expect(results.some(v => v.name === "Neon Bar")).toBe(true)
  })

  it("partial name match — 'hap' matches 'Happy Massage'", async () => {
    const results = await prisma.venue.findMany({
      where: { isActive: true, name: { contains: "hap", mode: "insensitive" } },
    })
    expect(results.some(v => v.name === "Happy Massage")).toBe(true)
  })

  it("search by category name — 'massage' matches venues in Massage category", async () => {
    const results = await prisma.venue.findMany({
      where: {
        isActive: true,
        category: { name: { contains: "massage", mode: "insensitive" } },
      },
      include: { category: true },
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(v => v.category.name.toLowerCase().includes("massage"))).toBe(true)
  })

  it("partial category match — 'mass' matches Massage category", async () => {
    const results = await prisma.venue.findMany({
      where: {
        isActive: true,
        category: { name: { contains: "mass", mode: "insensitive" } },
      },
      include: { category: true },
    })
    expect(results.some(v => v.name === "Happy Massage")).toBe(true)
  })

  it("combined OR search — name OR category match", async () => {
    const q = "bar"
    const results = await prisma.venue.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { category: true },
    })
    // Should match "Neon Bar" (name) and potentially others in Bar category
    expect(results.some(v => v.name === "Neon Bar")).toBe(true)
  })

  it("description search is case-insensitive", async () => {
    const results = await prisma.venue.findMany({
      where: {
        isActive: true,
        description: { contains: "WALKING STREET", mode: "insensitive" },
      },
    })
    expect(results.some(v => v.name === "Sunset GoGo")).toBe(true)
  })

  it("no results for non-matching query", async () => {
    const results = await prisma.venue.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: "zzzznonexistent", mode: "insensitive" } },
          { category: { name: { contains: "zzzznonexistent", mode: "insensitive" } } },
        ],
      },
    })
    expect(results.length).toBe(0)
  })
})

describe("Image URL handling (original)", () => {
  it("stores and retrieves imageUrl on venue", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Image Test Bar",
        slug: "image-test-bar",
        categoryId: cat!.id,
        imageUrl: "/uploads/images/test-image.jpg",
      },
    })
    expect(venue.imageUrl).toBe("/uploads/images/test-image.jpg")

    // Update imageUrl
    const updated = await prisma.venue.update({
      where: { id: venue.id },
      data: { imageUrl: "/uploads/images/new-image.webp" },
    })
    expect(updated.imageUrl).toBe("/uploads/images/new-image.webp")

    // Clear imageUrl
    const cleared = await prisma.venue.update({
      where: { id: venue.id },
      data: { imageUrl: null },
    })
    expect(cleared.imageUrl).toBeNull()

    await prisma.venue.delete({ where: { id: venue.id } })
  })
})
