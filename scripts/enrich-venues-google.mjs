/**
 * Enrich new venues with Google Places data:
 *  - Formatted address, phone, website, opening hours
 *  - Download up to 5 photos per venue
 *  - Set imageUrl (cover) + VenueMedia records
 *
 * Reads place_ids from the verified/discovered JSON files,
 * fetches details + photos from Google Places API (New),
 * saves images to data/uploads/images/, updates DB.
 *
 * Run on the server where the DB + uploads folder live.
 */

import { PrismaClient } from "@prisma/client"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname, extname } from "path"
import { fileURLToPath } from "url"
import { randomBytes } from "crypto"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const API_KEY = "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const UPLOADS_DIR = join(process.cwd(), "data", "uploads", "images")
const MAX_PHOTOS = 5

// Ensure uploads dir exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

/**
 * Fetch place details including photos, address, phone, website, hours
 */
async function getPlaceDetails(placeId) {
  const fieldMask = "displayName,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location"
  const url = `https://places.googleapis.com/v1/places/${placeId}`

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Places details HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json()
}

/**
 * Download a Google Places photo and save locally
 */
async function downloadPhoto(photoName) {
  // Step 1: Get the actual photo URI
  const metaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true&key=${API_KEY}`
  const metaRes = await fetch(metaUrl)

  if (!metaRes.ok) {
    throw new Error(`Photo meta HTTP ${metaRes.status}`)
  }

  const metaData = await metaRes.json()
  const photoUri = metaData.photoUri

  if (!photoUri) {
    throw new Error("No photoUri in response")
  }

  // Step 2: Download the actual image
  const imgRes = await fetch(photoUri)
  if (!imgRes.ok) {
    throw new Error(`Photo download HTTP ${imgRes.status}`)
  }

  const contentType = imgRes.headers.get("content-type") || "image/jpeg"
  let ext = ".jpg"
  if (contentType.includes("png")) ext = ".png"
  else if (contentType.includes("webp")) ext = ".webp"

  const buffer = Buffer.from(await imgRes.arrayBuffer())

  // Step 3: Save to uploads dir
  const filename = `${Date.now()}-${randomBytes(3).toString("hex")}${ext}`
  const filepath = join(UPLOADS_DIR, filename)
  writeFileSync(filepath, buffer)

  return `/uploads/images/${filename}`
}

/**
 * Extract district from address components
 */
function extractDistrict(components) {
  if (!components) return null
  for (const c of components) {
    if (c.types?.includes("sublocality") || c.types?.includes("sublocality_level_1")) {
      return c.longText || c.shortText || null
    }
  }
  // Try neighborhood
  for (const c of components) {
    if (c.types?.includes("neighborhood")) {
      return c.longText || c.shortText || null
    }
  }
  return null
}

/**
 * Format opening hours to a string
 */
function formatHours(regularOpeningHours) {
  if (!regularOpeningHours?.weekdayDescriptions) return null
  return regularOpeningHours.weekdayDescriptions.join("; ")
}

async function main() {
  // Load place_ids from both data files
  const placeMap = new Map() // venue name (lowercase) -> place_id

  // Batch 1
  try {
    const b1 = JSON.parse(readFileSync(join(__dirname, "..", "data", "new-venues-verified.json"), "utf-8"))
    for (const v of b1.verified) {
      if (v.google?.place_id) {
        placeMap.set(v.name.toLowerCase().trim(), v.google.place_id)
      }
    }
  } catch (e) {
    console.log("Warning: Could not load batch 1:", e.message)
  }

  // Batch 2
  try {
    const b2 = JSON.parse(readFileSync(join(__dirname, "..", "data", "discovered-venues-google.json"), "utf-8"))
    for (const v of b2.venues) {
      if (v.google?.place_id) {
        placeMap.set(v.name.toLowerCase().trim(), v.google.place_id)
      }
    }
  } catch (e) {
    console.log("Warning: Could not load batch 2:", e.message)
  }

  console.log(`Loaded ${placeMap.size} place_ids from data files\n`)

  // Get all new venues (needsVerification = true, no imageUrl)
  const venues = await prisma.venue.findMany({
    where: {
      needsVerification: true,
      OR: [
        { imageUrl: null },
        { imageUrl: "" },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      district: true,
    },
  })

  console.log(`Found ${venues.length} venues to enrich\n`)

  let enriched = 0
  let failed = 0

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i]
    const label = `[${i + 1}/${venues.length}] ${venue.name}`

    // Find place_id
    const placeId = placeMap.get(venue.name.toLowerCase().trim())
    if (!placeId) {
      console.log(`  SKIP (no place_id): ${label}`)
      failed++
      continue
    }

    // Rate limit
    if (i > 0) await new Promise(r => setTimeout(r, 300))

    try {
      // Fetch place details
      const details = await getPlaceDetails(placeId)

      // Extract data
      const address = details.formattedAddress || venue.address
      const phone = details.nationalPhoneNumber || details.internationalPhoneNumber || null
      const website = details.websiteUri || null
      const hours = formatHours(details.regularOpeningHours)
      const district = extractDistrict(details.addressComponents) || venue.district
      const lat = details.location?.latitude || null
      const lng = details.location?.longitude || null

      // Download photos
      const photos = details.photos || []
      const photoUrls = []

      for (let p = 0; p < Math.min(photos.length, MAX_PHOTOS); p++) {
        const photoName = photos[p].name
        if (!photoName) continue

        try {
          await new Promise(r => setTimeout(r, 150)) // rate limit
          const url = await downloadPhoto(photoName)
          photoUrls.push(url)
        } catch (err) {
          console.log(`    Photo ${p + 1} failed: ${err.message}`)
        }
      }

      if (photoUrls.length === 0) {
        console.log(`  NO PHOTOS: ${label}`)
      }

      // Update venue in DB
      const updateData = {
        address: address,
        district: district,
        ...(lat && { lat }),
        ...(lng && { lng }),
        ...(phone && { phone }),
        ...(website && { website }),
        ...(hours && { hours }),
        ...(photoUrls.length > 0 && { imageUrl: photoUrls[0] }),
      }

      await prisma.venue.update({
        where: { id: venue.id },
        data: updateData,
      })

      // Create VenueMedia records for additional photos
      if (photoUrls.length > 1) {
        const mediaData = photoUrls.slice(1).map((url, idx) => ({
          url,
          type: "IMAGE",
          order: idx,
          venueId: venue.id,
        }))

        await prisma.venueMedia.createMany({ data: mediaData })
      }

      enriched++
      console.log(`  OK: ${label} - ${photoUrls.length} photos, addr: ${address?.slice(0, 60)}...`)

    } catch (err) {
      console.log(`  ERROR: ${label}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Enriched: ${enriched}`)
  console.log(`Failed/Skipped: ${failed}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
