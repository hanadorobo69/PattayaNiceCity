/**
 * Import new spots from new_spots_combined.json
 * For each spot: search Google Places by name, enrich with real data, insert into DB
 *
 * Usage:
 *   npx tsx scripts/import-new-spots.ts              # dry run
 *   npx tsx scripts/import-new-spots.ts --live        # insert into DB
 *   npx tsx scripts/import-new-spots.ts --live --with-photos
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const prisma = new PrismaClient()
const API_KEY = process.env.GOOGLE_MAPS_KEY

const DRY_RUN = !process.argv.includes("--live")
const WITH_PHOTOS = process.argv.includes("--with-photos")
const RATE_LIMIT_MS = 300
const PATTAYA = { latitude: 12.905, longitude: 100.880 }
const RADIUS = 20000
const UPLOAD_DIR = join(process.cwd(), "data", "uploads", "images")

// ─── Types ───────────────────────────────────────────────────
interface InputSpot {
  name: string
  slug: string
  category: string
  categorySlug: string
  address: string
  district: string | null
  description: string | null
  isActive: boolean
  [key: string]: any
}

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
}

// ─── Helpers ─────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
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

function extractDistrict(address: string, fallback: string | null): string | null {
  const lower = address.toLowerCase()
  if (lower.includes("pratamnak") || lower.includes("pratumnak")) return "Pratamnak"
  if (lower.includes("jomtien")) return "Jomtien"
  if (lower.includes("naklua")) return "Naklua"
  if (lower.includes("south pattaya")) return "South Pattaya"
  if (lower.includes("north pattaya")) return "North Pattaya"
  if (lower.includes("central pattaya")) return "Central Pattaya"
  if (lower.includes("walking street") || lower.includes("walking st")) return "Walking Street"
  if (lower.includes("soi buakhao") || lower.includes("buakhao")) return "Soi Buakhao"
  if (lower.includes("soi 6") || lower.includes("soi6")) return "Soi 6"
  if (lower.includes("second road") || lower.includes("2nd road")) return "Second Road"
  if (lower.includes("third road") || lower.includes("3rd road")) return "Third Road"
  if (lower.includes("beach road")) return "Beach Road"
  if (lower.includes("tree town")) return "South Pattaya"
  return fallback
}

// ─── Google Places API ─────────────────────────────────────
async function searchPlace(name: string): Promise<PlaceResult | null> {
  const fieldMask = [
    "places.id", "places.displayName", "places.formattedAddress",
    "places.location", "places.rating", "places.userRatingCount",
    "places.regularOpeningHours", "places.websiteUri",
    "places.internationalPhoneNumber", "places.nationalPhoneNumber",
    "places.photos", "places.businessStatus",
  ].join(",")

  // Try name + Pattaya first
  for (const query of [`${name} Pattaya`, name]) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY!,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: { circle: { center: PATTAYA, radius: RADIUS } },
          maxResultCount: 3,
        }),
      })
      const data = await res.json()
      const places = data.places ?? []
      if (places.length > 0) return places[0]
    } catch {}
    await sleep(RATE_LIMIT_MS)
  }
  return null
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
  } catch {
    return null
  }
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.error("GOOGLE_MAPS_KEY not set in .env")
    process.exit(1)
  }

  // Load spots from combined JSON
  const spotsRaw: InputSpot[] = JSON.parse(readFileSync("new_spots_combined.json", "utf8"))
  console.log("╔══════════════════════════════════════════════════════════╗")
  console.log("║     PATTAYA VICE CITY — New Spots Enrichment Import    ║")
  console.log("╚══════════════════════════════════════════════════════════╝")
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`)
  console.log(`  Photos: ${WITH_PHOTOS ? "ON" : "OFF"}`)
  console.log(`  Spots to process: ${spotsRaw.length}`)
  console.log()

  // Load category slug → id mapping
  const dbCategories = await prisma.category.findMany()
  const slugToId: Record<string, string> = {}
  for (const cat of dbCategories) slugToId[cat.slug] = cat.id

  let created = 0, skipped = 0, notFound = 0, failed = 0
  let apiCalls = 0

  for (let i = 0; i < spotsRaw.length; i++) {
    const spot = spotsRaw[i]
    const progress = `[${i + 1}/${spotsRaw.length}]`

    // Check if already exists
    const existing = await prisma.venue.findFirst({
      where: { name: { equals: spot.name, mode: "insensitive" } },
      select: { id: true },
    })
    if (existing) {
      console.log(`  ${progress} ⏭️  "${spot.name}" — already exists`)
      skipped++
      continue
    }

    // Also check by slug
    const existingSlug = await prisma.venue.findUnique({
      where: { slug: spot.slug },
      select: { id: true },
    })
    if (existingSlug) {
      console.log(`  ${progress} ⏭️  "${spot.name}" — slug exists`)
      skipped++
      continue
    }

    // Skip inactive spots
    if (!spot.isActive) {
      console.log(`  ${progress} ⏭️  "${spot.name}" — marked inactive`)
      skipped++
      continue
    }

    // Resolve category
    const categoryId = slugToId[spot.categorySlug]
    if (!categoryId) {
      console.log(`  ${progress} ⚠️  "${spot.name}" — category "${spot.categorySlug}" not found`)
      failed++
      continue
    }

    // Search Google Places
    console.log(`  ${progress} 🔍 Searching "${spot.name}"...`)
    const place = await searchPlace(spot.name)
    apiCalls++

    let address = spot.address
    let lat: number | null = null
    let lng: number | null = null
    let phone: string | null = null
    let website: string | null = null
    let hours: any = null
    let rating: number | null = null
    let reviewCount: number | null = null
    let district = spot.district
    let photoNames: string[] = []
    let googlePlaceId: string | null = null

    if (place) {
      googlePlaceId = place.id
      address = place.formattedAddress || address
      lat = place.location?.latitude ?? null
      lng = place.location?.longitude ?? null
      phone = place.internationalPhoneNumber || place.nationalPhoneNumber || null
      website = place.websiteUri || null
      hours = parseHours(place.regularOpeningHours?.periods)
      rating = place.rating ?? null
      reviewCount = place.userRatingCount ?? null
      district = extractDistrict(address, spot.district)
      photoNames = (place.photos ?? []).slice(0, 5).map(p => p.name)
      console.log(`         ✓ Found — ★${rating || "?"} (${reviewCount || 0} reviews) — ${address.slice(0, 60)}...`)
    } else {
      console.log(`         ✗ Not found on Google — using provided data`)
      notFound++
    }

    if (DRY_RUN) continue

    // Generate unique slug
    let venueSlug = makeSlug(spot.name)
    if (!venueSlug) venueSlug = spot.slug
    let counter = 1
    while (await prisma.venue.findUnique({ where: { slug: venueSlug } })) {
      venueSlug = `${makeSlug(spot.name)}-${counter++}`
    }

    // Download photos
    let imageUrl: string | null = null
    let additionalPhotos: string[] = []
    if (WITH_PHOTOS && photoNames.length > 0) {
      imageUrl = await downloadPhoto(photoNames[0])
      await sleep(RATE_LIMIT_MS)
      for (let pi = 1; pi < photoNames.length; pi++) {
        const url = await downloadPhoto(photoNames[pi])
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
          description: spot.description || null,
          address: address || null,
          district,
          city: "Pattaya",
          lat,
          lng,
          phone,
          website,
          hours: hours ? JSON.stringify(hours) : null,
          imageUrl,
          isActive: true,
          isVerified: false,
        },
      })

      // Create additional media
      for (let mi = 0; mi < additionalPhotos.length; mi++) {
        await prisma.venueMedia.create({
          data: { venueId: venue.id, url: additionalPhotos[mi], type: "IMAGE", order: mi },
        })
      }

      console.log(`         ✅ Created "${spot.name}" (${venueSlug})`)
      created++
    } catch (e: any) {
      console.error(`         ❌ Failed: ${e.message}`)
      failed++
    }

    await sleep(100)
  }

  console.log()
  console.log("══════════════════════════════════════════")
  console.log(`  Created:   ${created}`)
  console.log(`  Skipped:   ${skipped} (already existed / inactive)`)
  console.log(`  Not found: ${notFound} (no Google match, ${DRY_RUN ? "would use" : "used"} provided data)`)
  console.log(`  Failed:    ${failed}`)
  console.log(`  API calls: ${apiCalls}`)
  console.log("══════════════════════════════════════════")

  await prisma.$disconnect()
}

main().catch(e => {
  console.error("Fatal error:", e)
  process.exit(1)
})
