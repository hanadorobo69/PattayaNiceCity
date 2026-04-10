/**
 * Scrape top-quality venues in specific categories and zones.
 * Focuses on best-rated, verified, existing venues on Google.
 * Deduplicates against existing DB entries.
 * Enriches with photos and contact data.
 *
 * Run: node scripts/scrape-venues-zones.mjs
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

// Zone bounding boxes (approximate)
const ZONES = {
  "soi-6": {
    label: "Soi 6",
    lat: 12.9375, lng: 100.8815,
    bounds: { latMin: 12.935, latMax: 12.940, lngMin: 100.878, lngMax: 100.885 },
  },
  "jomtien": {
    label: "Jomtien",
    lat: 12.8860, lng: 100.8700,
    bounds: { latMin: 12.870, latMax: 12.910, lngMin: 100.855, lngMax: 100.890 },
  },
  "pratumnak": {
    label: "Pratumnak",
    lat: 12.9150, lng: 100.8680,
    bounds: { latMin: 12.905, latMax: 12.930, lngMin: 100.860, lngMax: 100.880 },
  },
}

// Category mapping to Google search terms
const CATEGORIES = {
  "gogo-bar": {
    slug: "gogo-bar",
    searchTerms: ["go go bar", "gogo bar", "a go go", "agogo club", "agogo bar", "go-go club"],
  },
  "girly-bar": {
    slug: "girly-bar",
    searchTerms: ["girl bar", "beer bar", "hostess bar", "girly bar", "bar girls"],
  },
  "club": {
    slug: "club",
    searchTerms: ["nightclub", "night club", "dance club", "discotheque", "disco club"],
  },
  "bj-bar": {
    slug: "bj-bar",
    searchTerms: ["bj bar", "blow job bar", "soi 6 bar short time", "special bar"],
  },
}

// Tasks: category + zone combos
const TASKS = [
  { category: "gogo-bar", zones: ["soi-6", "jomtien", "pratumnak"] },
  { category: "girly-bar", zones: ["jomtien", "pratumnak"] },
  { category: "club", zones: ["jomtien", "pratumnak"] },
  { category: "bj-bar", zones: ["jomtien", "pratumnak"] },
]

const SEARCH_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress,places.rating,places.userRatingCount,places.types"
const DETAIL_MASK = "displayName,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location,rating,userRatingCount"

// ---- API helpers ----

async function searchPlaces(query, zone) {
  const z = ZONES[zone]
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
          low: { latitude: z.bounds.latMin, longitude: z.bounds.lngMin },
          high: { latitude: z.bounds.latMax, longitude: z.bounds.lngMax },
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
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

function inZone(lat, lng, zone) {
  const z = ZONES[zone]
  // Allow a margin around the zone
  const margin = 0.01
  return lat >= z.bounds.latMin - margin && lat <= z.bounds.latMax + margin
    && lng >= z.bounds.lngMin - margin && lng <= z.bounds.lngMax + margin
}

// Check if a venue name is likely a bar/club (not a restaurant, hotel, etc.)
function isLikelyVenue(name, types, categorySlug) {
  const nameLower = name.toLowerCase()
  // Exclude obvious non-matches
  const excludeWords = ["restaurant", "pharmacy", "hospital", "school", "temple", "mosque",
    "7-eleven", "7eleven", "family mart", "tesco", "big c", "central", "terminal 21",
    "dentist", "clinic", "bank", "atm", "police", "post office", "laundry"]
  for (const w of excludeWords) {
    if (nameLower.includes(w)) return false
  }

  // For nightclub category, also check types
  if (categorySlug === "club") {
    const goodTypes = ["night_club", "bar", "entertainment", "event_venue"]
    if (types && types.some(t => goodTypes.includes(t))) return true
    const clubWords = ["club", "disco", "nightclub", "lounge", "party"]
    if (clubWords.some(w => nameLower.includes(w))) return true
  }

  return true
}

// ---- Main ----

async function main() {
  // Load all existing venue names and slugs for dedup
  const allVenues = await prisma.venue.findMany({
    select: { name: true, slug: true },
  })
  const existingNames = new Set(allVenues.map(v => v.name.toLowerCase().trim()))
  const existingSlugs = new Set(allVenues.map(v => v.slug))

  // Load category IDs
  const categoryMap = {}
  for (const catKey of Object.keys(CATEGORIES)) {
    const cat = await prisma.category.findUnique({ where: { slug: catKey } })
    if (!cat) { console.error(`Category ${catKey} not found!`); return }
    categoryMap[catKey] = cat.id
  }

  let totalInserted = 0
  let totalSkipped = 0

  for (const task of TASKS) {
    const catConfig = CATEGORIES[task.category]
    const categoryId = categoryMap[task.category]

    for (const zoneKey of task.zones) {
      const zone = ZONES[zoneKey]
      console.log(`\n${"=".repeat(60)}`)
      console.log(`  Category: ${task.category} | Zone: ${zone.label}`)
      console.log(`${"=".repeat(60)}\n`)

      // Search with multiple terms
      const candidates = new Map() // placeId -> data

      for (const term of catConfig.searchTerms) {
        const query = `${term} ${zone.label} Pattaya Thailand`
        console.log(`  Searching: "${query}"`)
        await new Promise(r => setTimeout(r, 400))

        try {
          const places = await searchPlaces(query, zoneKey)
          for (const p of places) {
            const lat = p.location?.latitude
            const lng = p.location?.longitude
            if (!lat || !lng) continue
            if (!inZone(lat, lng, zoneKey)) continue
            if (p.businessStatus === "CLOSED_PERMANENTLY") continue
            if (!isLikelyVenue(p.displayName?.text || "", p.types, task.category)) continue

            const id = p.id
            if (!candidates.has(id)) {
              candidates.set(id, { ...p, queryHits: 1 })
            } else {
              candidates.get(id).queryHits++
            }
          }
          console.log(`    ${places.length} results, ${candidates.size} unique candidates`)
        } catch (err) {
          console.log(`    ERROR: ${err.message}`)
        }
      }

      // Score candidates
      const scored = []
      for (const [placeId, place] of candidates) {
        const name = place.displayName?.text || "Unknown"
        const rating = place.rating || 0
        const reviewCount = place.userRatingCount || 0

        // Score: rating * 10 + log(reviews) * 5 + queryHits * 3
        let score = rating * 10 + Math.log10(Math.max(reviewCount, 1)) * 5 + (place.queryHits - 1) * 3

        // Bonus for bar/nightclub types
        const types = place.types || []
        if (types.includes("bar") || types.includes("night_club")) score += 5
        if (types.includes("restaurant") && !types.includes("bar")) score -= 3

        scored.push({
          placeId,
          name,
          lat: place.location?.latitude,
          lng: place.location?.longitude,
          address: place.formattedAddress,
          rating,
          reviewCount,
          score,
        })
      }

      // Sort by score, take top 20
      scored.sort((a, b) => b.score - a.score)
      const top = scored.slice(0, 20)

      console.log(`\n  Top candidates:`)
      for (let i = 0; i < top.length; i++) {
        const c = top[i]
        console.log(`    ${i + 1}. ${c.name} (${c.rating}/5, ${c.reviewCount} reviews, score: ${c.score.toFixed(1)})`)
      }

      // Insert candidates (dedup against existing)
      let inserted = 0
      for (const candidate of top) {
        const nameLower = candidate.name.toLowerCase().trim()
        const slug = makeSlug(candidate.name)

        // Check for duplicates
        if (existingNames.has(nameLower)) {
          console.log(`  SKIP (duplicate name): ${candidate.name}`)
          totalSkipped++
          continue
        }
        if (existingSlugs.has(slug)) {
          console.log(`  SKIP (duplicate slug): ${candidate.name} -> ${slug}`)
          totalSkipped++
          continue
        }

        // Fetch details + photos
        await new Promise(r => setTimeout(r, 350))
        let details
        try {
          details = await getPlaceDetails(candidate.placeId)
        } catch (err) {
          console.log(`  ERROR details for ${candidate.name}: ${err.message}`)
          continue
        }

        const address = details.formattedAddress || candidate.address
        const district = extractDistrict(details.addressComponents) || zone.label
        const phone = details.nationalPhoneNumber || details.internationalPhoneNumber || null
        const website = details.websiteUri || null
        const hours = formatHours(details.regularOpeningHours)

        // Download photos
        const photoUrls = []
        const photos = details.photos || []
        for (let p = 0; p < Math.min(photos.length, MAX_PHOTOS); p++) {
          const photoName = photos[p].name
          if (!photoName) continue
          try {
            await new Promise(r => setTimeout(r, 150))
            const url = await downloadPhoto(photoName)
            photoUrls.push(url)
          } catch (err) { /* skip */ }
        }

        // Determine final slug (avoid collision)
        let finalSlug = slug
        if (existingSlugs.has(finalSlug)) {
          finalSlug = finalSlug + "-" + zoneKey
          if (existingSlugs.has(finalSlug)) {
            finalSlug = finalSlug + "-" + randomBytes(2).toString("hex")
          }
        }

        try {
          const venue = await prisma.venue.create({
            data: {
              name: candidate.name,
              slug: finalSlug,
              address,
              district,
              phone,
              website,
              hours,
              lat: candidate.lat,
              lng: candidate.lng,
              priceRange: "$$",
              categoryId,
              isActive: true,
              isVerified: false,
              needsVerification: true,
              ...(photoUrls.length > 0 && { imageUrl: photoUrls[0] }),
            },
          })

          // Additional photos
          if (photoUrls.length > 1) {
            await prisma.venueMedia.createMany({
              data: photoUrls.slice(1).map((url, idx) => ({
                url, type: "IMAGE", order: idx, venueId: venue.id,
              })),
            })
          }

          existingNames.add(nameLower)
          existingSlugs.add(finalSlug)
          inserted++
          totalInserted++

          console.log(`  OK: ${candidate.name} (${finalSlug}) - ${photoUrls.length} photos, rating: ${candidate.rating}`)
        } catch (err) {
          console.log(`  ERROR insert ${candidate.name}: ${err.message}`)
        }
      }

      console.log(`\n  Zone ${zone.label}: inserted ${inserted} new ${task.category} venues`)
    }
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`TOTAL INSERTED: ${totalInserted}`)
  console.log(`TOTAL SKIPPED (duplicates): ${totalSkipped}`)

  // Show final counts by category
  for (const catKey of Object.keys(CATEGORIES)) {
    const count = await prisma.venue.count({ where: { categoryId: categoryMap[catKey], isActive: true } })
    console.log(`  ${catKey}: ${count} venues`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
