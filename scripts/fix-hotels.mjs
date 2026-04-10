/**
 * Fix short-time hotel list:
 * 1. Remove non-short-time hotels (regular hotels wrongly categorized)
 * 2. Add curated list of real love inns / short-time hotels
 * 3. Enrich new entries with Google Places photos + contact data
 *
 * Run on server: node scripts/fix-hotels.mjs
 */

import { PrismaClient } from "@prisma/client"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { randomBytes } from "crypto"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const API_KEY = process.env.GOOGLE_PLACES_KEY || "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const UPLOADS_DIR = join(process.cwd(), "data", "uploads", "images")
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const MAX_PHOTOS = 5

// Hotels to REMOVE (not real short-time hotels)
const REMOVE_SLUGS = [
  "hotel-amber-pattaya",
  "beston-pattaya-hotel",
  "hotel-j-pattaya",
  "natural-beach-hotel",
  "nonze-pattaya",
  "easy-planet-pattaya",
  "sailor-hotel-pattaya",
  "bella-express-hotel-pattaya",
  "aloft-hotel-and-hostel-pattaya",
]

// New hotels to add (user's curated list of real love inns / short-time hotels)
const NEW_HOTELS = [
  { name: "Full Love Inn", zone: "Pattaya Central", address: "Soi Phettrakun, Pattaya" },
  { name: "Love Time Inn", zone: "Pattaya Beach Road", address: "Soi 13/1 Yamato, near Royal Garden, Pattaya" },
  { name: "Honeymoon Inn", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Classic Inn", zone: "Pattaya", address: "Soi 2, Pattaya" },
  { name: "Chuenruk Inn", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Money Motel", zone: "Pattaya", address: "North Pattaya area" },
  { name: "Star Inn", zone: "Pattaya", address: "Soi 6 / Beach Road area, Pattaya" },
  { name: "Rose Inn", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Fair Inn", zone: "Pattaya", address: "Soi 6 area, Pattaya" },
  { name: "Sweet Love Inn", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "TK Resort", zone: "Pattaya", address: "Soi Phettrakun, Pattaya" },
  { name: "Sidewalk Hotel", zone: "Pattaya", address: "North Pattaya / Soi Phettrakun area" },
  { name: "Sleep With Love Hotel", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Sleep Inn Pattaya", zone: "Pattaya", address: "Soi Phettrakun / Soi Phon Pra Prapha Nimit 2 area" },
  { name: "Sunny Hill", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Baan Kaew Resort", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Red Horse Resort", zone: "Pattaya", address: "Soi 6 / Soi Phettrakun area" },
  { name: "99 Good View Resort", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Kanika Hotel", zone: "Pattaya", address: "Soi Phettrakun area, Pattaya" },
  { name: "Viva Luv Motel", zone: "Pattaya Central", address: "Soi Paniad Chang (Soi Yume), Pattaya" },
  { name: "Picasso Motel", zone: "North Pattaya", address: "Soi Chaloem Prakiat 6, off Pattaya 3rd Road" },
  { name: "Bird Inn", zone: "Pattaya", address: "Near Soi Bongkot, Pattaya" },
  { name: "Party Love Inn", zone: "Pattaya", address: "Soi 26, off Noen Plubwan Road, Pattaya" },
  { name: "Star Love Inn", zone: "Pattaya Central", address: "Soi Arunotai, Soi 1, Sukhumvit, Soi 42, Pattaya" },
  { name: "Sai Kaew Resort", zone: "Jomtien", address: "Soi Chaiyapruek 3, Jomtien" },
  { name: "Q Resort", zone: "Jomtien", address: "Soi 2nd Road, Jomtien, Pattaya" },
  { name: "Chaiyapruk Lodge", zone: "Jomtien", address: "Soi Chaiyapruek 2, Jomtien" },
  { name: "Fair Inn Jomtien", zone: "Jomtien", address: "Soi Chaiyapruek 2, Jomtien" },
  { name: "Walk Inn Villa", zone: "Jomtien", address: "Soi 11, off Thepprasit Road, Jomtien" },
]

const SEARCH_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress"
const DETAIL_MASK = "displayName,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location"

// ---- API helpers ----

async function searchPlace(name, zone) {
  const query = `${name} ${zone || ""} Pattaya Thailand`.trim()
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
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
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": DETAIL_MASK },
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

function makeSlug(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

// ---- Main ----

async function main() {
  const hotelCategory = await prisma.category.findUnique({ where: { slug: "short-time-hotel" } })
  if (!hotelCategory) { console.error("Category 'short-time-hotel' not found!"); return }

  // ======= Step 1: Remove non-short-time hotels =======
  console.log("=== Step 1: Removing non-short-time hotels ===\n")

  for (const slug of REMOVE_SLUGS) {
    const venue = await prisma.venue.findUnique({ where: { slug } })
    if (!venue) { console.log(`  SKIP (not found): ${slug}`); continue }
    await prisma.venueMedia.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueMenuMedia.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueComment.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueRating.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueFavorite.deleteMany({ where: { venueId: venue.id } })
    await prisma.venue.delete({ where: { id: venue.id } })
    console.log(`  Deleted: ${venue.name}`)
  }

  // ======= Step 2: Check for duplicates =======
  console.log("\n=== Step 2: Checking for duplicates ===\n")

  const existingSlugs = new Set(
    (await prisma.venue.findMany({ where: { categoryId: hotelCategory.id }, select: { slug: true, name: true } }))
      .map(v => { console.log(`  Existing: ${v.name} (${v.slug})`); return v.slug })
  )

  const existingNames = new Set(
    (await prisma.venue.findMany({ where: { categoryId: hotelCategory.id }, select: { name: true } }))
      .map(v => v.name.toLowerCase().trim())
  )

  const toAdd = NEW_HOTELS.filter(h => {
    const slug = makeSlug(h.name)
    const nameLower = h.name.toLowerCase().trim()
    if (existingSlugs.has(slug) || existingNames.has(nameLower)) {
      console.log(`  DUPLICATE (skip): ${h.name}`)
      return false
    }
    return true
  })

  console.log(`\n  ${toAdd.length} new hotels to add\n`)

  // ======= Step 3: Insert + enrich from Google =======
  console.log("=== Step 3: Inserting and enriching new hotels ===\n")

  let inserted = 0, failed = 0

  for (let i = 0; i < toAdd.length; i++) {
    const hotel = toAdd[i]
    const label = `[${i + 1}/${toAdd.length}] ${hotel.name}`

    if (i > 0) await new Promise(r => setTimeout(r, 400))

    // Search Google for this hotel
    let googleData = null
    try {
      const places = await searchPlace(hotel.name, hotel.zone)
      if (places && places.length > 0) {
        // Try to find matching place
        let bestPlace = null
        for (const p of places) {
          if (nameMatches(hotel.name, p.displayName?.text || "")) {
            bestPlace = p
            break
          }
        }
        // If no name match, use first result if it's in Pattaya area
        if (!bestPlace) {
          const first = places[0]
          const fLat = first.location?.latitude
          const fLng = first.location?.longitude
          if (fLat && fLng && fLat > 12.7 && fLat < 13.1 && fLng > 100.7 && fLng < 101.0) {
            bestPlace = first
          }
        }

        if (bestPlace && bestPlace.businessStatus !== "CLOSED_PERMANENTLY") {
          await new Promise(r => setTimeout(r, 200))
          const details = await getPlaceDetails(bestPlace.id)
          googleData = {
            lat: bestPlace.location?.latitude || null,
            lng: bestPlace.location?.longitude || null,
            address: details.formattedAddress || hotel.address,
            district: extractDistrict(details.addressComponents) || null,
            phone: details.nationalPhoneNumber || details.internationalPhoneNumber || null,
            website: details.websiteUri || null,
            hours: formatHours(details.regularOpeningHours),
            photos: details.photos || [],
          }
          console.log(`  ${label} -> Google match: "${bestPlace.displayName?.text}"`)
        } else {
          console.log(`  ${label} -> No Google match (using provided address)`)
        }
      } else {
        console.log(`  ${label} -> Not found on Google`)
      }
    } catch (err) {
      console.log(`  ${label} -> Google error: ${err.message}`)
    }

    // Create venue
    let slug = makeSlug(hotel.name)
    if (existingSlugs.has(slug)) slug = slug + "-" + randomBytes(2).toString("hex")
    existingSlugs.add(slug)

    try {
      const venue = await prisma.venue.create({
        data: {
          name: hotel.name,
          slug,
          address: googleData?.address || hotel.address,
          district: googleData?.district || hotel.zone || null,
          phone: googleData?.phone || null,
          website: googleData?.website || null,
          hours: googleData?.hours || null,
          lat: googleData?.lat || null,
          lng: googleData?.lng || null,
          priceRange: "$",
          categoryId: hotelCategory.id,
          isActive: true,
          isVerified: false,
          needsVerification: true,
        },
      })

      // Download photos
      const photoUrls = []
      if (googleData?.photos?.length > 0) {
        for (let p = 0; p < Math.min(googleData.photos.length, MAX_PHOTOS); p++) {
          const photoName = googleData.photos[p].name
          if (!photoName) continue
          try {
            await new Promise(r => setTimeout(r, 150))
            const url = await downloadPhoto(photoName)
            photoUrls.push(url)
          } catch (err) { /* skip */ }
        }
      }

      if (photoUrls.length > 0) {
        await prisma.venue.update({ where: { id: venue.id }, data: { imageUrl: photoUrls[0] } })
        if (photoUrls.length > 1) {
          await prisma.venueMedia.createMany({
            data: photoUrls.slice(1).map((url, idx) => ({
              url, type: "IMAGE", order: idx, venueId: venue.id,
            })),
          })
        }
      }

      inserted++
      console.log(`  OK: ${hotel.name} (${slug}) - ${photoUrls.length} photos, phone: ${googleData?.phone || "none"}, hours: ${googleData?.hours ? "yes" : "no"}`)
    } catch (err) {
      console.log(`  ERROR: ${hotel.name}: ${err.message}`)
      failed++
    }
  }

  // ======= Summary =======
  console.log(`\n${"=".repeat(50)}`)
  console.log(`Removed:  ${REMOVE_SLUGS.length} non-short-time hotels`)
  console.log(`Inserted: ${inserted} new short-time hotels`)
  console.log(`Failed:   ${failed}`)

  // Final count
  const total = await prisma.venue.count({ where: { categoryId: hotelCategory.id, isActive: true } })
  console.log(`\nTotal short-time hotels in DB: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
