/**
 * Import Top Spots from Google Places API (New)
 *
 * Searches for the best-rated venues per category in Pattaya,
 * scores them with: rating * log10(userRatingCount + 10),
 * then upserts the top 15 into the database.
 *
 * Usage:
 *   npx tsx scripts/import-top-spots.ts              # dry run (default)
 *   npx tsx scripts/import-top-spots.ts --live        # actually insert into DB
 *   npx tsx scripts/import-top-spots.ts --with-photos # also download Google photos
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const prisma = new PrismaClient()
const API_KEY = process.env.GOOGLE_MAPS_KEY

// ─── Config ──────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes("--live")
const WITH_PHOTOS = process.argv.includes("--with-photos")
const RATE_LIMIT_MS = 300
const TOP_N = 15
const MAX_RESULTS = 30

const PATTAYA = { latitude: 12.905, longitude: 100.880 }
const RADIUS = 20000

const UPLOAD_DIR = join(process.cwd(), "data", "uploads", "images")

// ─── Category search queries → DB slug mapping ──────────────
// Two entries can share a slug (results get merged & deduped)
const CATEGORIES: { query: string; slug: string; label: string }[] = [
  { query: "bar Pattaya nightlife",               slug: "bar",              label: "Bar" },
  { query: "gogo bar Pattaya",                    slug: "gogo-bar",         label: "GoGo Bar" },
  { query: "russian gogo bar Pattaya",            slug: "russian-gogo",     label: "Russian GoGo" },
  { query: "nightclub Pattaya",                   slug: "club",             label: "Club" },
  { query: "gentlemen club Pattaya",              slug: "gentlemans-club",  label: "Gentleman's Club" },
  { query: "KTV karaoke Pattaya",                 slug: "ktv",              label: "KTV" },
  { query: "soi 6 bar Pattaya",                    slug: "bj-bar",           label: "BJ Bar" },
  { query: "massage parlor Pattaya",              slug: "massage",          label: "Massage" },
  { query: "short time hotel Pattaya",            slug: "short-time-hotel", label: "Short Time Hotel" },
  { query: "cannabis coffee shop Pattaya",        slug: "coffee-shop",      label: "Coffee Shop Cannabis" },
  { query: "weed dispensary Pattaya",             slug: "coffee-shop",      label: "Weed Coffee Shop" },
  { query: "ladyboy bar Pattaya",                 slug: "ladyboy-bar",      label: "Ladyboy Bar" },
  { query: "ladyboy gogo Pattaya",               slug: "ladyboy-gogo",     label: "Ladyboy GoGo" },
  { query: "ladyboy club Pattaya",               slug: "ladyboy-club",     label: "Ladyboy Club" },
  { query: "ladyboy massage Pattaya",            slug: "ladyboy-massage",  label: "Ladyboy Massage" },
  { query: "gay bar Pattaya",                     slug: "gay-bar",          label: "Gay Bar" },
  { query: "gay gogo Pattaya",                    slug: "gay-gogo",         label: "Gay GoGo" },
  { query: "gay club Pattaya",                    slug: "gay-club",         label: "Gay Club" },
  { query: "gay massage Pattaya",                 slug: "gay-massage",      label: "Gay Massage" },
]

// ─── Types ───────────────────────────────────────────────────
interface PlaceResult {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  regularOpeningHours?: { periods?: any[] }
  websiteUri?: string
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  photos?: { name: string }[]
  businessStatus?: string
  types?: string[]
}

interface ScoredSpot {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  score: number
  address: string
  lat: number
  lng: number
  phone: string | null
  website: string | null
  hours: Record<string, { open: string; close: string; closed: boolean }> | null
  photos: string[] // resource names
  district: string | null
}

// ─── Helpers ─────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
}

function computeScore(rating: number, count: number): number {
  return rating * Math.log10(count + 10)
}

function parseHours(periods: any[] | undefined): Record<string, { open: string; close: string; closed: boolean }> | null {
  if (!periods?.length) return null
  const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
  const hours: Record<string, { open: string; close: string; closed: boolean }> = {}
  for (const d of dayMap) hours[d] = { open: "00:00", close: "00:00", closed: true }
  for (const p of periods) {
    const openDay = dayMap[p.open?.day ?? 0]
    if (openDay && p.open) {
      const oh = String(p.open.hour ?? 0).padStart(2, "0")
      const om = String(p.open.minute ?? 0).padStart(2, "0")
      const ch = String(p.close?.hour ?? 0).padStart(2, "0")
      const cm = String(p.close?.minute ?? 0).padStart(2, "0")
      hours[openDay] = { open: `${oh}:${om}`, close: `${ch}:${cm}`, closed: false }
    }
  }
  return hours
}

function extractDistrict(address: string): string | null {
  const lower = address.toLowerCase()
  if (lower.includes("pratamnak") || lower.includes("pratumnak")) return "Pratamnak"
  if (lower.includes("jomtien")) return "Jomtien"
  if (lower.includes("naklua")) return "Naklua"
  if (lower.includes("south pattaya")) return "South Pattaya"
  if (lower.includes("north pattaya")) return "North Pattaya"
  if (lower.includes("central pattaya")) return "Central Pattaya"
  if (lower.includes("walking street") || lower.includes("walking st")) return "Walking Street"
  if (lower.includes("soi buakhao") || lower.includes("buakhao")) return "Soi Buakhao"
  if (lower.includes("soi 6")) return "Soi 6"
  if (lower.includes("second road") || lower.includes("2nd road")) return "Second Road"
  if (lower.includes("third road") || lower.includes("3rd road")) return "Third Road"
  if (lower.includes("beach road")) return "Beach Road"
  return null
}

// ─── Google Places API (New) ─────────────────────────────────
async function textSearch(query: string): Promise<PlaceResult[]> {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.regularOpeningHours",
    "places.websiteUri",
    "places.internationalPhoneNumber",
    "places.nationalPhoneNumber",
    "places.photos",
    "places.businessStatus",
  ].join(",")

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: { center: PATTAYA, radius: RADIUS },
      },
      maxResultCount: MAX_RESULTS,
    }),
  })

  const data = await res.json()
  if (data.error) {
    console.error(`  API Error: ${data.error.message}`)
    return []
  }
  return data.places ?? []
}

async function downloadPhoto(photoName: string): Promise<string | null> {
  try {
    const metaRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": API_KEY! } }
    )
    const meta = await metaRes.json()
    if (!meta.photoUri) return null

    const imgRes = await fetch(meta.photoUri)
    if (!imgRes.ok) return null

    const contentType = imgRes.headers.get("content-type") || "image/jpeg"
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    await mkdir(UPLOAD_DIR, { recursive: true })
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    await writeFile(join(UPLOAD_DIR, filename), buffer)

    return `/uploads/images/${filename}`
  } catch (e) {
    console.error(`  Photo download failed: ${e}`)
    return null
  }
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.error("GOOGLE_MAPS_KEY not set in .env")
    process.exit(1)
  }

  console.log("╔══════════════════════════════════════════════════════════╗")
  console.log("║        PATTAYA VICE CITY — Top Spots Importer          ║")
  console.log("╚══════════════════════════════════════════════════════════╝")
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (use --live to insert)" : "LIVE — will insert into DB"}`)
  console.log(`  Photos: ${WITH_PHOTOS ? "ON (will download)" : "OFF (use --with-photos to enable)"}`)
  console.log(`  Top N: ${TOP_N} per category`)
  console.log()

  // Load DB categories for slug → id mapping, create missing ones
  const dbCategories = await prisma.category.findMany()
  const slugToId: Record<string, string> = {}
  for (const cat of dbCategories) slugToId[cat.slug] = cat.id

  // Ensure all needed categories exist
  const neededSlugs = [...new Set(CATEGORIES.map(c => c.slug))]
  for (const slug of neededSlugs) {
    if (!slugToId[slug]) {
      const label = CATEGORIES.find(c => c.slug === slug)?.label ?? slug
      console.log(`  Creating missing category "${slug}" (${label})...`)
      const cat = await prisma.category.create({
        data: { name: label, slug, color: "#22C55E", icon: "🌿", sortOrder: 15 },
      })
      slugToId[slug] = cat.id
    }
  }

  // Group search queries by slug to merge results
  const slugGroups: Record<string, { queries: string[]; label: string }> = {}
  for (const c of CATEGORIES) {
    if (!slugGroups[c.slug]) slugGroups[c.slug] = { queries: [], label: c.label }
    slugGroups[c.slug].queries.push(c.query)
  }

  const allResults: Record<string, ScoredSpot[]> = {}
  let totalApiCalls = 0

  for (const [slug, group] of Object.entries(slugGroups)) {
    const categoryId = slugToId[slug]
    if (!categoryId) {
      console.log(`  ⚠️  Category "${slug}" not found in DB — skipping`)
      continue
    }

    console.log(`━━━ ${group.label} (${slug}) ━━━`)

    // Run all queries for this slug and merge by place ID
    const placeMap = new Map<string, PlaceResult>()
    for (const query of group.queries) {
      console.log(`  Searching: "${query}"`)
      const results = await textSearch(query)
      totalApiCalls++
      console.log(`  → ${results.length} results`)

      for (const p of results) {
        if (p.businessStatus === "CLOSED_PERMANENTLY") continue
        if (p.id && !placeMap.has(p.id)) placeMap.set(p.id, p)
      }
      await sleep(RATE_LIMIT_MS)
    }

    // Score and rank
    const scored: ScoredSpot[] = [...placeMap.values()]
      .filter(p => p.rating && p.userRatingCount && p.userRatingCount >= 3)
      .map(p => ({
        placeId: p.id,
        name: p.displayName?.text ?? "Unknown",
        rating: p.rating!,
        reviewCount: p.userRatingCount!,
        score: computeScore(p.rating!, p.userRatingCount!),
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        hours: parseHours(p.regularOpeningHours?.periods),
        photos: (p.photos ?? []).slice(0, 5).map(ph => ph.name),
        district: extractDistrict(p.formattedAddress ?? ""),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N)

    allResults[slug] = scored

    // Display table
    console.log(`  ✅ ${placeMap.size} uniques → top ${scored.length} selected\n`)
    console.log("  #  | Score | ★    | Reviews | Name")
    console.log("  ---|-------|------|---------|" + "─".repeat(40))
    scored.forEach((s, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)} | ${s.score.toFixed(1).padStart(5)} | ${s.rating.toFixed(1)} | ${String(s.reviewCount).padStart(7)} | ${s.name}`
      )
    })
    console.log()
  }

  // ─── Save JSON backup ───────────────────────────────────
  const backupDir = join(process.cwd(), "backup")
  await mkdir(backupDir, { recursive: true })
  const backupPath = join(backupDir, "top-spots.json")
  await writeFile(backupPath, JSON.stringify(allResults, null, 2))
  console.log(`💾 Saved backup to ${backupPath}`)
  console.log(`📊 Total API calls: ${totalApiCalls}`)

  // ─── Upsert into DB ─────────────────────────────────────
  if (DRY_RUN) {
    console.log("\n🔒 DRY RUN — no database changes. Run with --live to insert.")
    await prisma.$disconnect()
    return
  }

  console.log("\n🚀 Inserting into database...\n")

  let created = 0
  let skipped = 0

  for (const [slug, spots] of Object.entries(allResults)) {
    const categoryId = slugToId[slug]
    if (!categoryId) continue

    for (const spot of spots) {
      // Check for existing venue (case-insensitive name match)
      const existing = await prisma.venue.findFirst({
        where: { name: { equals: spot.name, mode: "insensitive" } },
        select: { id: true, name: true },
      })

      if (existing) {
        console.log(`  ⏭️  "${spot.name}" already exists — skipped`)
        skipped++
        continue
      }

      // Generate unique slug
      const baseSlug = makeSlug(spot.name)
      let venueSlug = baseSlug
      let counter = 1
      while (await prisma.venue.findUnique({ where: { slug: venueSlug } })) {
        venueSlug = `${baseSlug}-${counter++}`
      }

      // Download cover photo if enabled
      let imageUrl: string | null = null
      let additionalPhotos: string[] = []
      if (WITH_PHOTOS && spot.photos.length > 0) {
        console.log(`  📸 Downloading photos for "${spot.name}"...`)
        imageUrl = await downloadPhoto(spot.photos[0])
        await sleep(RATE_LIMIT_MS)

        // Download up to 4 additional photos
        for (let i = 1; i < Math.min(spot.photos.length, 5); i++) {
          const url = await downloadPhoto(spot.photos[i])
          if (url) additionalPhotos.push(url)
          await sleep(RATE_LIMIT_MS)
        }
      }

      try {
        const venue = await prisma.venue.create({
          data: {
            name: spot.name,
            slug: venueSlug,
            categoryId,
            address: spot.address || null,
            district: spot.district,
            city: "Pattaya",
            lat: spot.lat || null,
            lng: spot.lng || null,
            phone: spot.phone,
            website: spot.website,
            hours: spot.hours ? JSON.stringify(spot.hours) : null,
            imageUrl,
            isActive: true,
            isVerified: false,
          },
        })

        // Create additional media
        for (let i = 0; i < additionalPhotos.length; i++) {
          await prisma.venueMedia.create({
            data: { venueId: venue.id, url: additionalPhotos[i], type: "IMAGE", order: i },
          })
        }

        console.log(`  ✅ Created "${spot.name}" (${venueSlug}) — ★${spot.rating} (${spot.reviewCount} reviews)`)
        created++
      } catch (e: any) {
        console.error(`  ❌ Failed to create "${spot.name}": ${e.message}`)
      }

      await sleep(100)
    }
  }

  console.log(`\n══════════════════════════════════════════`)
  console.log(`  Created: ${created}`)
  console.log(`  Skipped: ${skipped} (already existed)`)
  console.log(`  Total:   ${created + skipped}`)
  console.log(`══════════════════════════════════════════`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error("Fatal error:", e)
  process.exit(1)
})
