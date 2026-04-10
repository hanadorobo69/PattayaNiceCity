/**
 * Discover NEW venues directly from Google Places API (New).
 * Searches for bars, gogo bars, gentleman's clubs, ladyboy bars, gay bars in Pattaya.
 * Cross-checks against existing venues to avoid duplicates.
 * Only outputs venues that are OPERATIONAL on Google.
 */

import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const API_KEY = "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const FIELD_MASK = "places.displayName,places.id,places.location,places.businessStatus,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.primaryType"

// Load existing venue names for dedup
function loadExistingNames() {
  const names = new Set()

  // From venues.json export
  try {
    const data = require(join(__dirname, "..", "venues.json"))
    const venues = Array.isArray(data) ? data : data.venues || []
    for (const v of venues) names.add(v.name.toLowerCase().trim())
  } catch { /* ignore */ }

  // From already verified new venues
  try {
    const data = JSON.parse(readFileSync(join(__dirname, "..", "data", "new-venues-verified.json"), "utf-8"))
    for (const v of data.verified) names.add(v.name.toLowerCase().trim())
  } catch { /* ignore */ }

  return names
}

// Search queries organized by category
const SEARCHES = [
  // GoGo bars
  { query: "gogo bar Walking Street Pattaya", type: "gogo-bar", zone: "Walking Street" },
  { query: "go go bar Pattaya", type: "gogo-bar", zone: "Pattaya" },
  { query: "agogo Pattaya", type: "gogo-bar", zone: "Pattaya" },
  { query: "a go go LK Metro Pattaya", type: "gogo-bar", zone: "LK Metro" },
  { query: "gogo bar Soi Diamond Pattaya", type: "gogo-bar", zone: "Soi Diamond" },

  // Girly bars
  { query: "beer bar Soi 6 Pattaya", type: "girly-bar", zone: "Soi 6" },
  { query: "girly bar Pattaya", type: "girly-bar", zone: "Pattaya" },
  { query: "beer bar LK Metro Pattaya", type: "girly-bar", zone: "LK Metro" },
  { query: "beer bar Soi Buakhao Pattaya", type: "girly-bar", zone: "Soi Buakhao" },
  { query: "bar girl Soi 7 Pattaya", type: "girly-bar", zone: "Soi 7" },
  { query: "beer bar Tree Town Pattaya", type: "girly-bar", zone: "Tree Town" },
  { query: "beer bar Soi Made in Thailand Pattaya", type: "girly-bar", zone: "Soi Made in Thailand" },
  { query: "hostess bar Pattaya", type: "girly-bar", zone: "Pattaya" },
  { query: "bar Soi Chaiyapoon Pattaya", type: "girly-bar", zone: "Soi Chaiyapoon" },
  { query: "beer bar complex Pattaya", type: "girly-bar", zone: "Pattaya" },

  // Gentleman's clubs
  { query: "gentleman club Pattaya", type: "gentlemans-club", zone: "Pattaya" },
  { query: "gentlemen's club Pattaya", type: "gentlemans-club", zone: "Pattaya" },
  { query: "strip club Pattaya", type: "gentlemans-club", zone: "Pattaya" },

  // Ladyboy bars
  { query: "ladyboy bar Pattaya", type: "ladyboy-bar", zone: "Pattaya" },
  { query: "ladyboy gogo Pattaya", type: "ladyboy-gogo", zone: "Pattaya" },
  { query: "ladyboy club Pattaya", type: "ladyboy-bar", zone: "Pattaya" },

  // Gay bars
  { query: "gay bar Pattaya", type: "gay-bar", zone: "Pattaya" },
  { query: "gay gogo bar Pattaya", type: "gay-gogo", zone: "Pattaya" },
  { query: "gay club Pattaya Sunee Plaza", type: "gay-bar", zone: "Sunee Plaza" },
  { query: "boyztown Pattaya bar", type: "gay-bar", zone: "Boyztown" },

  // BJ bars
  { query: "bj bar Soi 6 Pattaya", type: "bj-bar", zone: "Soi 6" },
  { query: "blow job bar Pattaya", type: "bj-bar", zone: "Pattaya" },

  // Russian gogo
  { query: "russian gogo bar Pattaya", type: "russian-gogo", zone: "Pattaya" },
  { query: "russian bar Walking Street Pattaya", type: "russian-gogo", zone: "Walking Street" },
]

// Pattaya bounding box (to filter out results from other cities)
const PATTAYA_BOUNDS = {
  minLat: 12.87,
  maxLat: 12.98,
  minLng: 100.84,
  maxLng: 100.92,
}

function isInPattaya(lat, lng) {
  if (!lat || !lng) return false
  return (
    lat >= PATTAYA_BOUNDS.minLat &&
    lat <= PATTAYA_BOUNDS.maxLat &&
    lng >= PATTAYA_BOUNDS.minLng &&
    lng <= PATTAYA_BOUNDS.maxLng
  )
}

async function searchPlaces(query) {
  const url = "https://places.googleapis.com/v1/places:searchText"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.places || []
}

// Determine zone from address
function guessZone(address, defaultZone) {
  const addr = (address || "").toLowerCase()
  if (addr.includes("walking street") || addr.includes("walking st")) return "Walking Street"
  if (addr.includes("soi 6") || addr.includes("soi6")) return "Soi 6"
  if (addr.includes("lk metro") || addr.includes("lk metro")) return "LK Metro"
  if (addr.includes("buakhao") || addr.includes("buakao") || addr.includes("buakaow")) return "Soi Buakhao"
  if (addr.includes("tree town")) return "Tree Town"
  if (addr.includes("made in thailand")) return "Soi Made in Thailand"
  if (addr.includes("boyztown") || addr.includes("boys town") || addr.includes("sunee")) return "Boyztown"
  if (addr.includes("soi diamond")) return "Soi Diamond"
  if (addr.includes("naklua")) return "Naklua"
  if (addr.includes("jomtien")) return "Jomtien"
  if (addr.includes("second road") || addr.includes("saisong")) return "Second Road"
  if (addr.includes("third road")) return "Third Road"
  return defaultZone
}

// Exclude types that are clearly not nightlife bars
const EXCLUDE_TYPES = new Set([
  "restaurant", "cafe", "hotel", "lodging", "convenience_store", "supermarket",
  "shopping_mall", "hospital", "pharmacy", "gas_station", "car_dealer",
  "travel_agency", "real_estate_agency", "bank", "atm", "laundry",
  "beauty_salon", "hair_care", "gym", "spa", "school", "church",
])

function isLikelyBar(place) {
  const types = place.types || []
  // If it has a clearly non-bar type, skip
  for (const t of types) {
    if (EXCLUDE_TYPES.has(t)) return false
  }
  // Must be in a bar/nightlife related category OR have bar/club in name
  const name = (place.displayName?.text || "").toLowerCase()
  const barTypes = ["bar", "night_club", "nightclub"]
  const hasBarType = types.some(t => barTypes.includes(t))
  const hasBarName = /\b(bar|gogo|go-go|agogo|a go go|club|lounge|pub|cabaret)\b/i.test(name)
  return hasBarType || hasBarName
}

async function main() {
  const existingNames = loadExistingNames()
  console.log(`Loaded ${existingNames.size} existing venue names for dedup\n`)

  const discovered = new Map() // place_id -> venue data
  let searchCount = 0

  for (const search of SEARCHES) {
    searchCount++
    console.log(`[${searchCount}/${SEARCHES.length}] Searching: "${search.query}"`)

    // Rate limit
    await new Promise((r) => setTimeout(r, 250))

    try {
      const places = await searchPlaces(search.query)
      let added = 0

      for (const place of places) {
        const placeId = place.id
        if (discovered.has(placeId)) continue

        const name = place.displayName?.text || ""
        const nameLower = name.toLowerCase().trim()
        const lat = place.location?.latitude
        const lng = place.location?.longitude

        // Skip if not in Pattaya
        if (!isInPattaya(lat, lng)) continue

        // Skip if permanently closed
        if (place.businessStatus === "CLOSED_PERMANENTLY") continue

        // Skip if already exists in our database
        if (existingNames.has(nameLower)) continue

        // Skip if clearly not a bar
        if (!isLikelyBar(place)) continue

        const zone = guessZone(place.formattedAddress, search.zone)

        discovered.set(placeId, {
          name,
          type: search.type,
          zone,
          google: {
            place_id: placeId,
            name,
            lat,
            lng,
            rating: place.rating || null,
            user_ratings_total: place.userRatingCount || 0,
            business_status: place.businessStatus || "UNKNOWN",
            formatted_address: place.formattedAddress || "",
            types: place.types || [],
            primary_type: place.primaryType || "",
          },
        })
        added++
      }

      console.log(`   Found ${places.length} results, added ${added} new`)
    } catch (err) {
      console.log(`   ERROR: ${err.message}`)
    }
  }

  // Convert to array and sort by rating
  const allVenues = [...discovered.values()].sort(
    (a, b) => (b.google.user_ratings_total || 0) - (a.google.user_ratings_total || 0)
  )

  console.log(`\n=== DISCOVERY RESULTS ===`)
  console.log(`Total unique venues found: ${allVenues.length}`)

  // Breakdown by type
  const typeCounts = {}
  for (const v of allVenues) {
    typeCounts[v.type] = (typeCounts[v.type] || 0) + 1
  }
  console.log("\nBy type:")
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  console.log("\nAll discovered venues:")
  allVenues.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name} (${v.type}) - ${v.zone} [rating: ${v.google.rating || "N/A"}, reviews: ${v.google.user_ratings_total}]`)
  })

  // Save output
  const output = {
    metadata: {
      city: "Pattaya",
      discoveredAt: new Date().toISOString().split("T")[0],
      source: "Google Places API (New) - Text Search",
      totalFound: allVenues.length,
      searchQueries: SEARCHES.length,
    },
    venues: allVenues,
  }

  const outPath = join(__dirname, "..", "data", "discovered-venues-google.json")
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8")
  console.log(`\nSaved to ${outPath}`)
}

main().catch(console.error)
