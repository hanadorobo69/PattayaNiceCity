/**
 * Enrich ALL active venues with Google Places data.
 * Focuses on: hours, phone, website, address improvements.
 * Downloads photos only for venues missing imageUrl.
 * Skips venues that already have hours + phone (already complete).
 */

import { PrismaClient } from "@prisma/client"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { randomBytes } from "crypto"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const API_KEY = "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const UPLOADS_DIR = join(process.cwd(), "data", "uploads", "images")
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const MAX_PHOTOS = 5
const SEARCH_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress,places.types"
const DETAIL_MASK = "displayName,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location"

// ---- API helpers ----

async function searchPlace(name, zone) {
  const query = `${name} ${zone || ""} Pattaya Thailand`.trim()
  const url = "https://places.googleapis.com/v1/places:searchText"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": SEARCH_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 3 }),
  })
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`)
  const data = await res.json()
  return data.places || []
}

async function getPlaceDetails(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": DETAIL_MASK,
    },
  })
  if (!res.ok) throw new Error(`Details HTTP ${res.status}`)
  return res.json()
}

async function downloadPhoto(photoName) {
  const metaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true&key=${API_KEY}`
  const metaRes = await fetch(metaUrl)
  if (!metaRes.ok) throw new Error(`Photo meta HTTP ${metaRes.status}`)
  const metaData = await metaRes.json()
  if (!metaData.photoUri) throw new Error("No photoUri")

  const imgRes = await fetch(metaData.photoUri)
  if (!imgRes.ok) throw new Error(`Photo download HTTP ${imgRes.status}`)

  const contentType = imgRes.headers.get("content-type") || "image/jpeg"
  let ext = ".jpg"
  if (contentType.includes("png")) ext = ".png"
  else if (contentType.includes("webp")) ext = ".webp"

  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const filename = `${Date.now()}-${randomBytes(3).toString("hex")}${ext}`
  writeFileSync(join(UPLOADS_DIR, filename), buffer)
  return `/uploads/images/${filename}`
}

// ---- Matching ----

function nameMatches(ourName, googleName) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const a = norm(ourName), b = norm(googleName)
  if (!a || !b) return false
  if (a === b) return true
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  if (shorter.length >= 3 && shorter.length / longer.length >= 0.3 && longer.includes(shorter)) return true
  return false
}

function formatHours(roh) {
  if (!roh?.weekdayDescriptions) return null
  return roh.weekdayDescriptions.join("; ")
}

function extractDistrict(components) {
  if (!components) return null
  for (const c of components) {
    if (c.types?.includes("sublocality") || c.types?.includes("sublocality_level_1"))
      return c.longText || c.shortText || null
  }
  for (const c of components) {
    if (c.types?.includes("neighborhood"))
      return c.longText || c.shortText || null
  }
  return null
}

// ---- Main ----

async function main() {
  // Get all venues that are missing hours OR phone OR images
  const venues = await prisma.venue.findMany({
    where: {
      isActive: true,
      OR: [
        { hours: null },
        { phone: null },
        { imageUrl: null },
        { imageUrl: "" },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      district: true,
      address: true,
      phone: true,
      website: true,
      hours: true,
      imageUrl: true,
      lat: true,
      lng: true,
    },
    orderBy: { name: "asc" },
  })

  console.log(`Found ${venues.length} venues needing enrichment\n`)

  let enriched = 0
  let skipped = 0
  let failed = 0
  let photosDownloaded = 0

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i]
    const label = `[${i + 1}/${venues.length}] ${venue.name}`
    const needsHours = !venue.hours
    const needsPhone = !venue.phone
    const needsImage = !venue.imageUrl

    // Rate limit between venues
    if (i > 0) await new Promise(r => setTimeout(r, 350))

    try {
      // Step 1: Search for the venue on Google
      const places = await searchPlace(venue.name, venue.district)

      if (!places || places.length === 0) {
        console.log(`  SKIP (not found)  ${label}`)
        skipped++
        continue
      }

      // Find best name match
      let bestPlace = null
      for (const p of places) {
        if (nameMatches(venue.name, p.displayName?.text || "")) {
          bestPlace = p
          break
        }
      }

      if (!bestPlace) {
        // Use first result if close GPS
        const first = places[0]
        const fLat = first.location?.latitude
        const fLng = first.location?.longitude
        if (venue.lat && venue.lng && fLat && fLng) {
          const dist = Math.sqrt((fLat - venue.lat) ** 2 + (fLng - venue.lng) ** 2) * 111000
          if (dist < 100) bestPlace = first
        }
        if (!bestPlace) {
          console.log(`  SKIP (no match)   ${label} -> Google: "${first.displayName?.text}"`)
          skipped++
          continue
        }
      }

      // Skip permanently closed
      if (bestPlace.businessStatus === "CLOSED_PERMANENTLY") {
        console.log(`  SKIP (closed)     ${label}`)
        skipped++
        continue
      }

      const placeId = bestPlace.id

      // Step 2: Fetch detailed info
      await new Promise(r => setTimeout(r, 200))
      const details = await getPlaceDetails(placeId)

      const updateData = {}

      // Hours
      const hours = formatHours(details.regularOpeningHours)
      if (hours && !venue.hours) updateData.hours = hours

      // Phone
      const phone = details.nationalPhoneNumber || details.internationalPhoneNumber || null
      if (phone && !venue.phone) updateData.phone = phone

      // Website
      const website = details.websiteUri || null
      if (website && !venue.website) updateData.website = website

      // Address improvement
      const addr = details.formattedAddress
      if (addr && (!venue.address || venue.address.length < addr.length)) updateData.address = addr

      // GPS coordinates (if missing)
      if (!venue.lat && details.location?.latitude) updateData.lat = details.location.latitude
      if (!venue.lng && details.location?.longitude) updateData.lng = details.location.longitude

      // Photos (only if venue has no image)
      if (needsImage && details.photos?.length > 0) {
        const photoUrls = []
        for (let p = 0; p < Math.min(details.photos.length, MAX_PHOTOS); p++) {
          const photoName = details.photos[p].name
          if (!photoName) continue
          try {
            await new Promise(r => setTimeout(r, 150))
            const url = await downloadPhoto(photoName)
            photoUrls.push(url)
          } catch (err) {
            // Skip failed photos silently
          }
        }
        if (photoUrls.length > 0) {
          updateData.imageUrl = photoUrls[0]
          photosDownloaded += photoUrls.length

          // Create VenueMedia for additional photos
          if (photoUrls.length > 1) {
            await prisma.venueMedia.createMany({
              data: photoUrls.slice(1).map((url, idx) => ({
                url, type: "IMAGE", order: idx, venueId: venue.id,
              })),
            })
          }
        }
      }

      // Only update if we have new data
      if (Object.keys(updateData).length === 0) {
        console.log(`  SKIP (no new data) ${label}`)
        skipped++
        continue
      }

      await prisma.venue.update({
        where: { id: venue.id },
        data: updateData,
      })

      const updates = Object.keys(updateData).join(", ")
      console.log(`  OK  ${label} -> ${updates}`)
      enriched++

    } catch (err) {
      console.log(`  ERR ${label}: ${err.message}`)
      failed++
    }

    // Progress checkpoint every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${venues.length} (enriched: ${enriched}, skipped: ${skipped}, failed: ${failed}) ---\n`)
    }
  }

  console.log(`\n${"=".repeat(50)}`)
  console.log(`Enriched:  ${enriched}`)
  console.log(`Skipped:   ${skipped}`)
  console.log(`Failed:    ${failed}`)
  console.log(`Photos DL: ${photosDownloaded}`)

  // Final stats
  const noHours = await prisma.venue.count({ where: { isActive: true, hours: null } })
  const noPhone = await prisma.venue.count({ where: { isActive: true, phone: null } })
  const noImage = await prisma.venue.count({ where: { isActive: true, OR: [{ imageUrl: null }, { imageUrl: "" }] } })
  console.log(`\nRemaining gaps:`)
  console.log(`  Missing hours: ${noHours}`)
  console.log(`  Missing phone: ${noPhone}`)
  console.log(`  Missing image: ${noImage}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
