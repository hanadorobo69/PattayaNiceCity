/**
 * Discover and insert 15 quality SHORT-TIME hotels in Pattaya.
 *
 * 1. Delete ALL existing short-time-hotel venues
 * 2. Search Google for cheap/hourly/short-time hotels
 * 3. Fetch details + reviews to verify they're actually short-time friendly
 * 4. Score and rank by: rating, price, short-time availability
 * 5. Keep top 15
 * 6. Insert into DB with category short-time-hotel
 * 7. Enrich with photos and contact data
 *
 * Run on server: node scripts/discover-short-time-hotels.mjs
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

// Pattaya bounding box
const BOUNDS = { latMin: 12.87, latMax: 12.98, lngMin: 100.84, lngMax: 100.92 }

// Search queries targeting short-time / cheap hotels
const SEARCH_QUERIES = [
  "short time hotel pattaya",
  "hourly hotel pattaya",
  "cheap guest house pattaya walking street",
  "short time room pattaya soi 6",
  "joiner friendly hotel pattaya cheap",
  "pattaya hotel short stay hourly rate",
  "guest house pattaya soi buakhao cheap",
  "cheap room pattaya night",
  "pattaya motel short time",
  "love hotel pattaya",
  "hotel courte duree pattaya",
  "pattaya guesthouse soi 6",
  "pattaya hotel 500 baht",
  "budget hotel pattaya walking street",
  "short time hotel pattaya soi 8",
  "pattaya inn short time room",
]

// Keywords in reviews that confirm short-time friendliness
const ST_KEYWORDS = [
  "short time", "short-time", "shorttime",
  "hourly", "hour rate", "1 hour", "2 hour", "few hours",
  "joiner", "joiner friendly", "joiner-friendly",
  "girl friendly", "guest friendly", "lady friendly",
  "bring girl", "bring lady", "bring someone",
  "cheap room", "cheap hotel", "budget",
  "by the hour", "per hour",
  "day use", "day rate",
  "no questions", "no id",
  "barfine", "bar fine",
  "walking street", "soi 6", "soi buakhao",
  "500 baht", "300 baht", "400 baht", "600 baht", "700 baht", "800 baht",
]

// Keywords that indicate it's NOT a short-time place (luxury resorts etc.)
const EXCLUDE_KEYWORDS = [
  "resort", "5 star", "5-star", "luxury", "pool villa", "beachfront resort",
  "family resort", "all inclusive",
]

// ---- API helpers ----

const SEARCH_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.primaryType,places.priceLevel"
const DETAIL_MASK = "displayName,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location,rating,userRatingCount,reviews,priceLevel,editorialSummary"

async function searchPlaces(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": SEARCH_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      locationBias: {
        rectangle: {
          low: { latitude: BOUNDS.latMin, longitude: BOUNDS.lngMin },
          high: { latitude: BOUNDS.latMax, longitude: BOUNDS.lngMax },
        },
      },
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Search HTTP ${res.status}: ${txt.slice(0, 200)}`)
  }
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
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function inBounds(lat, lng) {
  return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax
}

// Score a hotel based on reviews, rating, and price signals
function scoreHotel(place, details) {
  let score = 0
  const rating = place.rating || details.rating || 0
  const reviewCount = place.userRatingCount || details.userRatingCount || 0

  // Base rating score (0-20)
  score += Math.min(rating * 4, 20)

  // Review count bonus (0-10) - more reviews = more reliable
  score += Math.min(reviewCount / 50, 10)

  // Price level bonus - cheaper is better (PRICE_LEVEL_INEXPENSIVE = best)
  const priceLevel = place.priceLevel || details.priceLevel
  if (priceLevel === "PRICE_LEVEL_FREE" || priceLevel === "PRICE_LEVEL_INEXPENSIVE") score += 15
  else if (priceLevel === "PRICE_LEVEL_MODERATE") score += 8
  else if (priceLevel === "PRICE_LEVEL_EXPENSIVE") score -= 5
  else if (priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") score -= 15

  // Review keyword analysis
  const reviews = details.reviews || []
  let stMentions = 0
  let excludeMentions = 0
  const allReviewText = reviews.map(r => (r.text?.text || "").toLowerCase()).join(" ")

  for (const kw of ST_KEYWORDS) {
    if (allReviewText.includes(kw)) stMentions++
  }
  for (const kw of EXCLUDE_KEYWORDS) {
    if (allReviewText.includes(kw)) excludeMentions++
  }

  // Also check the name and editorial summary
  const nameAndSummary = ((place.displayName?.text || "") + " " + (details.editorialSummary?.text || "")).toLowerCase()
  for (const kw of ST_KEYWORDS) {
    if (nameAndSummary.includes(kw)) stMentions += 2
  }
  for (const kw of EXCLUDE_KEYWORDS) {
    if (nameAndSummary.includes(kw)) excludeMentions += 3
  }

  // Short-time keyword bonus (0-30)
  score += Math.min(stMentions * 3, 30)

  // Exclude penalty
  score -= excludeMentions * 5

  // Types bonus - lodging/hotel types
  const types = place.types || []
  if (types.includes("lodging") || types.includes("hotel")) score += 5
  if (types.includes("guest_house") || types.includes("motel")) score += 8

  // Penalty for being too upscale
  if (types.includes("resort") || types.includes("spa")) score -= 10

  return { score, stMentions, rating, reviewCount, priceLevel }
}

// ---- Main ----

async function main() {
  // Step 1: Delete ALL existing short-time-hotel venues
  console.log("=== Step 1: Deleting existing short-time-hotel venues ===\n")

  const hotelCategory = await prisma.category.findUnique({ where: { slug: "short-time-hotel" } })
  if (!hotelCategory) {
    console.error("Category 'short-time-hotel' not found!")
    return
  }

  const existingHotels = await prisma.venue.findMany({
    where: { categoryId: hotelCategory.id },
    select: { id: true, name: true },
  })

  console.log(`Found ${existingHotels.length} existing hotels to delete:`)
  for (const h of existingHotels) console.log(`  - ${h.name}`)

  // Delete related records first, then venues
  for (const h of existingHotels) {
    await prisma.venueMedia.deleteMany({ where: { venueId: h.id } })
    await prisma.venueMenuMedia.deleteMany({ where: { venueId: h.id } })
    await prisma.venueComment.deleteMany({ where: { venueId: h.id } })
    await prisma.venueRating.deleteMany({ where: { venueId: h.id } })
    await prisma.venueFavorite.deleteMany({ where: { venueId: h.id } })
    await prisma.venue.delete({ where: { id: h.id } })
    console.log(`  Deleted: ${h.name}`)
  }

  console.log(`\nDeleted ${existingHotels.length} hotels.\n`)

  // Step 2: Search Google for short-time hotels
  console.log("=== Step 2: Searching Google for short-time hotels ===\n")

  const allPlaces = new Map() // place_id -> place data

  for (const query of SEARCH_QUERIES) {
    console.log(`  Searching: "${query}"`)
    await new Promise(r => setTimeout(r, 400))

    try {
      const places = await searchPlaces(query)
      for (const p of places) {
        const lat = p.location?.latitude
        const lng = p.location?.longitude
        if (!lat || !lng || !inBounds(lat, lng)) continue
        if (p.businessStatus === "CLOSED_PERMANENTLY") continue

        const id = p.id
        if (!allPlaces.has(id)) {
          allPlaces.set(id, { ...p, queryHits: 1 })
        } else {
          allPlaces.get(id).queryHits++
        }
      }
      console.log(`    Found ${places.length} results, ${allPlaces.size} unique so far`)
    } catch (err) {
      console.log(`    ERROR: ${err.message}`)
    }
  }

  console.log(`\nTotal unique candidates: ${allPlaces.size}\n`)

  // Step 3: Fetch details + reviews for each candidate and score them
  console.log("=== Step 3: Fetching details and scoring candidates ===\n")

  const scored = []

  let idx = 0
  for (const [placeId, place] of allPlaces) {
    idx++
    const name = place.displayName?.text || "Unknown"
    console.log(`  [${idx}/${allPlaces.size}] ${name}`)

    await new Promise(r => setTimeout(r, 350))

    try {
      const details = await getPlaceDetails(placeId)
      const result = scoreHotel(place, details)

      // Multi-query hit bonus: appearing in multiple search queries = more relevant
      result.score += (place.queryHits - 1) * 3

      scored.push({
        placeId,
        name,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: details.formattedAddress || place.formattedAddress,
        district: extractDistrict(details.addressComponents),
        phone: details.nationalPhoneNumber || details.internationalPhoneNumber || null,
        website: details.websiteUri || null,
        hours: formatHours(details.regularOpeningHours),
        photos: details.photos || [],
        ...result,
      })

      console.log(`    Score: ${result.score.toFixed(1)} | Rating: ${result.rating} (${result.reviewCount}) | ST keywords: ${result.stMentions} | Price: ${result.priceLevel || "?"}`)
    } catch (err) {
      console.log(`    ERROR: ${err.message}`)
    }
  }

  // Step 4: Rank and keep top 15
  console.log("\n=== Step 4: Ranking and selecting top 15 ===\n")

  // Filter out negative scores (likely luxury/resort places)
  const viable = scored.filter(h => h.score > 0)
  viable.sort((a, b) => b.score - a.score)

  const top15 = viable.slice(0, 15)

  console.log("Selected hotels:")
  for (let i = 0; i < top15.length; i++) {
    const h = top15[i]
    console.log(`  ${i + 1}. ${h.name} - Score: ${h.score.toFixed(1)} | Rating: ${h.rating} (${h.reviewCount}) | ST: ${h.stMentions} | Price: ${h.priceLevel || "?"}`)
  }

  // Step 5: Check for duplicates against existing DB venues
  console.log("\n=== Step 5: Inserting into database ===\n")

  const existingSlugs = new Set(
    (await prisma.venue.findMany({ select: { slug: true } })).map(v => v.slug)
  )

  let inserted = 0

  for (const hotel of top15) {
    let slug = makeSlug(hotel.name)
    if (existingSlugs.has(slug)) {
      slug = slug + "-st"
      if (existingSlugs.has(slug)) {
        slug = slug + "-" + randomBytes(2).toString("hex")
      }
    }

    // Map price level to priceRange
    let priceRange = "$"
    if (hotel.priceLevel === "PRICE_LEVEL_MODERATE") priceRange = "$$"
    else if (hotel.priceLevel === "PRICE_LEVEL_EXPENSIVE") priceRange = "$$$"

    try {
      const venue = await prisma.venue.create({
        data: {
          name: hotel.name,
          slug,
          address: hotel.address || null,
          district: hotel.district || null,
          phone: hotel.phone || null,
          website: hotel.website || null,
          hours: hotel.hours || null,
          lat: hotel.lat,
          lng: hotel.lng,
          priceRange,
          categoryId: hotelCategory.id,
          isActive: true,
          isVerified: false,
          needsVerification: true,
        },
      })

      existingSlugs.add(slug)

      // Download photos
      const photoUrls = []
      for (let p = 0; p < Math.min(hotel.photos.length, MAX_PHOTOS); p++) {
        const photoName = hotel.photos[p].name
        if (!photoName) continue
        try {
          await new Promise(r => setTimeout(r, 150))
          const url = await downloadPhoto(photoName)
          photoUrls.push(url)
        } catch (err) {
          // Skip failed photos
        }
      }

      if (photoUrls.length > 0) {
        await prisma.venue.update({
          where: { id: venue.id },
          data: { imageUrl: photoUrls[0] },
        })
        if (photoUrls.length > 1) {
          await prisma.venueMedia.createMany({
            data: photoUrls.slice(1).map((url, idx) => ({
              url, type: "IMAGE", order: idx, venueId: venue.id,
            })),
          })
        }
      }

      inserted++
      console.log(`  OK: ${hotel.name} (${slug}) - ${photoUrls.length} photos`)
    } catch (err) {
      console.log(`  ERROR inserting ${hotel.name}: ${err.message}`)
    }
  }

  console.log(`\n${"=".repeat(50)}`)
  console.log(`Deleted:  ${existingHotels.length} old hotels`)
  console.log(`Inserted: ${inserted} new short-time hotels`)
  console.log(`\nDone!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
