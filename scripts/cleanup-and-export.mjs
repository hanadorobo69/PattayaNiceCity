/**
 * 1. Clear priceRange on all venues without ratings
 * 2. Scrape contacts/address/hours from Google (NO photos)
 * 3. Export all venues to data/venues.json
 *
 * Run on server: node scripts/cleanup-and-export.mjs
 */

import { PrismaClient } from "@prisma/client"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()
const API_KEY = process.env.GOOGLE_PLACES_KEY || "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const SEARCH_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress"
const DETAIL_MASK = "displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location"

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
  // ======= Step 1: Clear priceRange on unrated venues =======
  console.log("=== Step 1: Clearing priceRange on unrated venues ===\n")

  const cleared = await prisma.venue.updateMany({
    where: {
      isActive: true,
      venueRatings: { none: {} },
      priceRange: { not: null },
    },
    data: { priceRange: null },
  })
  console.log(`  Cleared priceRange on ${cleared.count} unrated venues\n`)

  // ======= Step 2: Scrape contacts/address/hours (NO photos) =======
  console.log("=== Step 2: Scraping contacts/address/hours ===\n")

  const venues = await prisma.venue.findMany({
    where: {
      isActive: true,
      OR: [
        { hours: null },
        { phone: null },
        { address: null },
      ],
    },
    select: {
      id: true, name: true, slug: true, district: true,
      address: true, phone: true, website: true, hours: true,
      lat: true, lng: true,
    },
    orderBy: { name: "asc" },
  })

  console.log(`  Found ${venues.length} venues missing contact data\n`)

  let enriched = 0, skipped = 0, failed = 0

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i]
    const label = `[${i + 1}/${venues.length}] ${venue.name}`

    if (i > 0) await new Promise(r => setTimeout(r, 350))

    try {
      const places = await searchPlace(venue.name, venue.district)
      if (!places || places.length === 0) {
        console.log(`  SKIP (not found)  ${label}`)
        skipped++
        continue
      }

      let bestPlace = null
      for (const p of places) {
        if (nameMatches(venue.name, p.displayName?.text || "")) {
          bestPlace = p
          break
        }
      }

      if (!bestPlace) {
        const first = places[0]
        const fLat = first.location?.latitude
        const fLng = first.location?.longitude
        if (venue.lat && venue.lng && fLat && fLng) {
          const dist = Math.sqrt((fLat - venue.lat) ** 2 + (fLng - venue.lng) ** 2) * 111000
          if (dist < 150) bestPlace = first
        }
        if (!bestPlace) {
          console.log(`  SKIP (no match)   ${label} -> "${places[0].displayName?.text}"`)
          skipped++
          continue
        }
      }

      if (bestPlace.businessStatus === "CLOSED_PERMANENTLY") {
        console.log(`  SKIP (closed)     ${label}`)
        skipped++
        continue
      }

      await new Promise(r => setTimeout(r, 200))
      const details = await getPlaceDetails(bestPlace.id)

      const updateData = {}

      const hours = formatHours(details.regularOpeningHours)
      if (hours && !venue.hours) updateData.hours = hours

      const phone = details.nationalPhoneNumber || details.internationalPhoneNumber || null
      if (phone && !venue.phone) updateData.phone = phone

      const website = details.websiteUri || null
      if (website && !venue.website) updateData.website = website

      const addr = details.formattedAddress
      if (addr && (!venue.address || venue.address.length < addr.length)) updateData.address = addr

      if (!venue.lat && details.location?.latitude) updateData.lat = details.location.latitude
      if (!venue.lng && details.location?.longitude) updateData.lng = details.location.longitude

      const district = extractDistrict(details.addressComponents)
      if (district && !venue.district) updateData.district = district

      if (Object.keys(updateData).length === 0) {
        console.log(`  SKIP (no new data) ${label}`)
        skipped++
        continue
      }

      await prisma.venue.update({ where: { id: venue.id }, data: updateData })
      console.log(`  OK  ${label} -> ${Object.keys(updateData).join(", ")}`)
      enriched++
    } catch (err) {
      console.log(`  ERR ${label}: ${err.message}`)
      failed++
    }

    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${venues.length} (enriched: ${enriched}, skipped: ${skipped}, failed: ${failed}) ---\n`)
    }
  }

  console.log(`\n  Enriched: ${enriched}, Skipped: ${skipped}, Failed: ${failed}\n`)

  // ======= Step 3: Export all venues to JSON =======
  console.log("=== Step 3: Exporting all venues to data/venues.json ===\n")

  const allVenues = await prisma.venue.findMany({
    where: { isActive: true },
    include: {
      category: { select: { slug: true, name: true, color: true, icon: true } },
      media: { select: { url: true, type: true, order: true }, orderBy: { order: "asc" } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  })

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalVenues: allVenues.length,
    venues: allVenues.map(v => ({
      name: v.name,
      slug: v.slug,
      category: v.category.slug,
      categoryName: v.category.name,
      categoryColor: v.category.color,
      categoryIcon: v.category.icon,
      description: v.description,
      address: v.address,
      district: v.district,
      phone: v.phone,
      website: v.website,
      hours: v.hours,
      lat: v.lat,
      lng: v.lng,
      imageUrl: v.imageUrl,
      media: v.media.map(m => ({ url: m.url, type: m.type })),
      priceRange: v.priceRange,
      isVerified: v.isVerified,
      geometryType: v.geometryType,
      geometryPath: v.geometryPath,
      areaRadius: v.areaRadius,
      widthHintMeters: v.widthHintMeters,
    })),
  }

  const dataDir = join(process.cwd(), "data")
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, "venues.json"), JSON.stringify(exportData, null, 2))
  console.log(`  Exported ${allVenues.length} venues to data/venues.json`)

  // Stats
  const stats = {}
  for (const v of allVenues) {
    const cat = v.category.name
    stats[cat] = (stats[cat] || 0) + 1
  }
  console.log("\n  By category:")
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`)
  }

  const noPhone = allVenues.filter(v => !v.phone).length
  const noHours = allVenues.filter(v => !v.hours).length
  const noImage = allVenues.filter(v => !v.imageUrl).length
  const noAddr = allVenues.filter(v => !v.address).length
  console.log(`\n  Remaining gaps:`)
  console.log(`    No phone: ${noPhone}`)
  console.log(`    No hours: ${noHours}`)
  console.log(`    No image: ${noImage}`)
  console.log(`    No address: ${noAddr}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
