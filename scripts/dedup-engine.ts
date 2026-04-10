/**
 * ══════════════════════════════════════════════════════════════
 *  PATTAYA VICE CITY — Deduplication & Enrichment Engine
 * ══════════════════════════════════════════════════════════════
 *
 * A complete system for:
 *   1. Exporting the existing venue database
 *   2. Normalizing all fields
 *   3. Scoring candidate spots against existing data
 *   4. Classifying: new / maybe_duplicate / duplicate / needs_review
 *   5. Producing a coverage report per category
 *   6. Generating a validated output file
 *
 * Usage:
 *   npx tsx scripts/dedup-engine.ts audit           # coverage report only
 *   npx tsx scripts/dedup-engine.ts check FILE      # check candidates from JSON/txt
 *   npx tsx scripts/dedup-engine.ts enrich FILE     # check + Google Places enrichment
 *   npx tsx scripts/dedup-engine.ts import FILE     # enrich + insert approved into DB
 *   npx tsx scripts/dedup-engine.ts import FILE --live  # actually write to DB
 *
 * Input file format: JSON with structure:
 *   { "category": "...", "spots": [ { name, slug, categorySlug, address, ... } ] }
 *   or array of such objects
 *   or flat array of spot objects
 *
 * Output: data/dedup-report-TIMESTAMP.json
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

// ══════════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════════

const THRESHOLDS = {
  /** Score >= this → definitely a duplicate */
  DUPLICATE: 0.85,
  /** Score >= this → probably a duplicate, needs human review */
  MAYBE_DUPLICATE: 0.55,
  /** Score >= this → suspicious, flag for review */
  NEEDS_REVIEW: 0.35,
  /** Below this → considered new */
  NEW: 0.35,
}

const WEIGHTS = {
  exactName: 1.0,       // Exact normalized name match
  fuzzyName: 0.7,       // Fuzzy string similarity
  phone: 0.6,           // Phone number match
  website: 0.5,         // Website domain match
  social: 0.4,          // Facebook/Instagram match
  geoProximity: 0.5,    // GPS within 50m
  geoNear: 0.25,        // GPS within 200m
  slugMatch: 0.8,       // Slug exact match
  addressSimilar: 0.3,  // Address similarity
}

const GEO_THRESHOLDS = {
  EXACT_METERS: 50,
  NEAR_METERS: 200,
}

// Category targets for enrichment
const CATEGORY_TARGETS: Record<string, number> = {
  "bar": 54, "gogo-bar": 58, "russian-gogo": 23, "club": 47,
  "gentlemans-club": 43, "ktv": 37, "bj-bar": 35, "massage": 40,
  "short-time-hotel": 37, "coffee-shop": 35, "ladyboy-bar": 34,
  "ladyboy-gogo": 13, "ladyboy-club": 20, "ladyboy-massage": 25,
  "gay-bar": 34, "gay-gogo": 10, "gay-club": 16, "gay-massage": 31,
}

// ══════════════════════════════════════════════════════════════
//  NORMALIZATION
// ══════════════════════════════════════════════════════════════

/** Normalize a venue name for comparison */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/['`'"]/g, "")                              // strip quotes
    .replace(/\bpattaya\b/gi, "")                        // remove "Pattaya"
    .replace(/\b(bar|club|pub|lounge|café|cafe|massage|spa|hotel|gogo|go-go|karaoke|ktv)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")                         // only letters/numbers/spaces
    .replace(/\s+/g, " ")
    .trim()
}

/** Normalize a phone number (strip spaces, dashes, country code) */
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[\s\-().+]/g, "")
  // Strip Thai country code
  if (cleaned.startsWith("66") && cleaned.length > 9) return cleaned.slice(2)
  if (cleaned.startsWith("0") && cleaned.length >= 9) return cleaned.slice(1)
  return cleaned || null
}

/** Extract domain from a URL */
function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "").toLowerCase()
  } catch { return null }
}

/** Extract social handle (works for Facebook URLs, Instagram handles, etc.) */
function normalizeSocial(url: string | null): string | null {
  if (!url) return null
  // Strip trailing slashes and extract last path segment
  const cleaned = url.replace(/\/+$/, "")
  const match = cleaned.match(/(?:facebook\.com|instagram\.com|fb\.com)\/([^/?#]+)/i)
  if (match) return match[1].toLowerCase()
  return cleaned.toLowerCase().replace(/[^a-z0-9]/g, "") || null
}

function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
}

// ══════════════════════════════════════════════════════════════
//  STRING SIMILARITY (Jaro-Winkler)
// ══════════════════════════════════════════════════════════════

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0
  if (!s1.length || !s2.length) return 0.0

  const matchDist = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0)
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, s2.length)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3

  // Winkler bonus for common prefix (up to 4 chars)
  let prefix = 0
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

/** Check if one string contains the other (after normalization) */
function containsMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

// ══════════════════════════════════════════════════════════════
//  GEO DISTANCE (Haversine)
// ══════════════════════════════════════════════════════════════

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ══════════════════════════════════════════════════════════════
//  DUPLICATE SCORING
// ══════════════════════════════════════════════════════════════

interface ExistingVenue {
  id: string
  slug: string
  name: string
  address: string | null
  district: string | null
  phone: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  lat: number | null
  lng: number | null
  category: { slug: string }
  // Normalized versions (computed)
  _normName: string
  _normPhone: string | null
  _domain: string | null
  _normFb: string | null
  _normIg: string | null
}

interface Candidate {
  name: string
  slug?: string
  categorySlug: string
  address?: string
  district?: string | null
  phone?: string | null
  website?: string | null
  facebook?: string | null
  instagram?: string | null
  lat?: number | null
  lng?: number | null
  description?: string | null
  [key: string]: any
}

interface MatchDetail {
  field: string
  score: number
  weight: number
  contribution: number
  detail: string
}

interface DedupResult {
  candidate: Candidate
  classification: "new" | "maybe_duplicate" | "duplicate" | "needs_review"
  totalScore: number
  bestMatch: { venue: { id: string; slug: string; name: string; category: string } } | null
  matchDetails: MatchDetail[]
  reason: string
}

function scoreCandidate(candidate: Candidate, existing: ExistingVenue[]): DedupResult {
  const candNormName = normalizeName(candidate.name)
  const candSlug = candidate.slug || makeSlug(candidate.name)
  const candPhone = normalizePhone(candidate.phone ?? null)
  const candDomain = extractDomain(candidate.website ?? null)
  const candFb = normalizeSocial(candidate.facebook ?? null)
  const candIg = normalizeSocial(candidate.instagram ?? null)

  let bestScore = 0
  let bestVenue: ExistingVenue | null = null
  let bestDetails: MatchDetail[] = []

  for (const venue of existing) {
    const details: MatchDetail[] = []
    let totalWeight = 0
    let weightedScore = 0

    // 1. Exact normalized name match
    if (candNormName && venue._normName && candNormName === venue._normName) {
      const d: MatchDetail = { field: "exactName", score: 1, weight: WEIGHTS.exactName, contribution: WEIGHTS.exactName, detail: `"${candNormName}" === "${venue._normName}"` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }

    // 2. Fuzzy name similarity
    if (candNormName && venue._normName) {
      const sim = jaroWinkler(candNormName, venue._normName)
      if (sim > 0.75) {
        const d: MatchDetail = { field: "fuzzyName", score: sim, weight: WEIGHTS.fuzzyName, contribution: sim * WEIGHTS.fuzzyName, detail: `JW("${candNormName}", "${venue._normName}") = ${sim.toFixed(3)}` }
        details.push(d)
        totalWeight += d.weight
        weightedScore += d.contribution
      }
      // Also check contains (e.g., "Sapphire" vs "Sapphire Club Pattaya")
      if (containsMatch(candNormName, venue._normName) && candNormName.length >= 4) {
        const bonus = 0.3
        const d: MatchDetail = { field: "nameContains", score: 1, weight: bonus, contribution: bonus, detail: `"${candNormName}" contains/in "${venue._normName}"` }
        details.push(d)
        totalWeight += bonus
        weightedScore += bonus
      }
    }

    // 3. Slug match
    if (candSlug === venue.slug) {
      const d: MatchDetail = { field: "slugMatch", score: 1, weight: WEIGHTS.slugMatch, contribution: WEIGHTS.slugMatch, detail: `slug "${candSlug}" matches` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }

    // 4. Phone match
    if (candPhone && venue._normPhone && candPhone === venue._normPhone) {
      const d: MatchDetail = { field: "phone", score: 1, weight: WEIGHTS.phone, contribution: WEIGHTS.phone, detail: `phone ${candPhone} matches` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }

    // 5. Website domain match
    if (candDomain && venue._domain && candDomain === venue._domain) {
      const d: MatchDetail = { field: "website", score: 1, weight: WEIGHTS.website, contribution: WEIGHTS.website, detail: `domain ${candDomain} matches` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }

    // 6. Social media match
    if (candFb && venue._normFb && candFb === venue._normFb) {
      const d: MatchDetail = { field: "facebook", score: 1, weight: WEIGHTS.social, contribution: WEIGHTS.social, detail: `FB @${candFb} matches` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }
    if (candIg && venue._normIg && candIg === venue._normIg) {
      const d: MatchDetail = { field: "instagram", score: 1, weight: WEIGHTS.social, contribution: WEIGHTS.social, detail: `IG @${candIg} matches` }
      details.push(d)
      totalWeight += d.weight
      weightedScore += d.contribution
    }

    // 7. Geo proximity
    if (candidate.lat && candidate.lng && venue.lat && venue.lng) {
      const dist = haversineMeters(candidate.lat, candidate.lng, venue.lat, venue.lng)
      if (dist <= GEO_THRESHOLDS.EXACT_METERS) {
        const d: MatchDetail = { field: "geoExact", score: 1, weight: WEIGHTS.geoProximity, contribution: WEIGHTS.geoProximity, detail: `${dist.toFixed(0)}m apart (< ${GEO_THRESHOLDS.EXACT_METERS}m)` }
        details.push(d)
        totalWeight += d.weight
        weightedScore += d.contribution
      } else if (dist <= GEO_THRESHOLDS.NEAR_METERS) {
        const d: MatchDetail = { field: "geoNear", score: 1, weight: WEIGHTS.geoNear, contribution: WEIGHTS.geoNear, detail: `${dist.toFixed(0)}m apart (< ${GEO_THRESHOLDS.NEAR_METERS}m)` }
        details.push(d)
        totalWeight += d.weight
        weightedScore += d.contribution
      }
    }

    // 8. Address similarity (only if same district)
    if (candidate.address && venue.address) {
      const candAddr = candidate.address.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
      const venueAddr = venue.address.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
      const addrSim = jaroWinkler(candAddr, venueAddr)
      if (addrSim > 0.8) {
        const d: MatchDetail = { field: "address", score: addrSim, weight: WEIGHTS.addressSimilar, contribution: addrSim * WEIGHTS.addressSimilar, detail: `address JW = ${addrSim.toFixed(3)}` }
        details.push(d)
        totalWeight += d.weight
        weightedScore += d.contribution
      }
    }

    // Compute final score (normalized)
    const finalScore = totalWeight > 0 ? weightedScore / Math.max(totalWeight, 1.5) : 0

    if (finalScore > bestScore) {
      bestScore = finalScore
      bestVenue = venue
      bestDetails = details
    }
  }

  // Classify
  let classification: DedupResult["classification"]
  let reason: string

  if (bestScore >= THRESHOLDS.DUPLICATE) {
    classification = "duplicate"
    reason = `High confidence duplicate of "${bestVenue!.name}" (score ${bestScore.toFixed(3)})`
  } else if (bestScore >= THRESHOLDS.MAYBE_DUPLICATE) {
    classification = "maybe_duplicate"
    reason = `Possible duplicate of "${bestVenue!.name}" (score ${bestScore.toFixed(3)}) — NEEDS HUMAN REVIEW`
  } else if (bestScore >= THRESHOLDS.NEEDS_REVIEW) {
    classification = "needs_review"
    reason = `Weak signals matching "${bestVenue?.name}" (score ${bestScore.toFixed(3)}) — review recommended`
  } else {
    classification = "new"
    reason = bestVenue ? `Best match "${bestVenue.name}" too low (score ${bestScore.toFixed(3)})` : "No similar venue found"
  }

  return {
    candidate,
    classification,
    totalScore: bestScore,
    bestMatch: bestVenue ? {
      venue: { id: bestVenue.id, slug: bestVenue.slug, name: bestVenue.name, category: bestVenue.category.slug },
    } : null,
    matchDetails: bestDetails,
    reason,
  }
}

// ══════════════════════════════════════════════════════════════
//  INPUT PARSING
// ══════════════════════════════════════════════════════════════

function parseCandidates(filePath: string): Candidate[] {
  const raw = readFileSync(filePath, "utf-8")
  let data: any

  // Try JSON first
  try {
    data = JSON.parse(raw)
  } catch {
    // Try as wrapped object (the new_spots_to_add.txt format — multiple JSON objects)
    try {
      // Wrap in array if multiple top-level objects
      const wrapped = "[" + raw.replace(/\}\s*\{/g, "},{") + "]"
      data = JSON.parse(wrapped)
    } catch {
      console.error("Cannot parse input file as JSON")
      process.exit(1)
    }
  }

  const candidates: Candidate[] = []

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.spots && Array.isArray(item.spots)) {
        // { category: "...", spots: [...] }
        for (const spot of item.spots) {
          candidates.push(spot)
        }
      } else if (item.name) {
        candidates.push(item)
      }
    }
  } else if (data.spots) {
    for (const spot of data.spots) {
      candidates.push(spot)
    }
  }

  return candidates
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE PLACES ENRICHMENT
// ══════════════════════════════════════════════════════════════

const API_KEY = process.env.GOOGLE_MAPS_KEY
const RATE_LIMIT_MS = 300
const PATTAYA = { latitude: 12.905, longitude: 100.880 }
const RADIUS = 20000

async function enrichCandidate(candidate: Candidate): Promise<Candidate> {
  if (!API_KEY) return candidate

  const fieldMask = [
    "places.id", "places.displayName", "places.formattedAddress",
    "places.location", "places.rating", "places.userRatingCount",
    "places.regularOpeningHours", "places.websiteUri",
    "places.internationalPhoneNumber", "places.nationalPhoneNumber",
    "places.photos", "places.businessStatus",
  ].join(",")

  for (const query of [`${candidate.name} Pattaya`, candidate.name]) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
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
      if (places.length > 0) {
        const p = places[0]
        if (p.businessStatus === "CLOSED_PERMANENTLY") {
          candidate._closedPermanently = true
          return candidate
        }
        candidate.address = p.formattedAddress || candidate.address
        candidate.lat = p.location?.latitude ?? candidate.lat
        candidate.lng = p.location?.longitude ?? candidate.lng
        candidate.phone = p.internationalPhoneNumber || p.nationalPhoneNumber || candidate.phone
        candidate.website = p.websiteUri || candidate.website
        candidate._googleRating = p.rating
        candidate._googleReviews = p.userRatingCount
        candidate._googlePlaceId = p.id
        candidate._photoNames = (p.photos ?? []).slice(0, 5).map((ph: any) => ph.name)
        return candidate
      }
    } catch {}
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
  }

  candidate._googleNotFound = true
  return candidate
}

// ══════════════════════════════════════════════════════════════
//  COVERAGE REPORT
// ══════════════════════════════════════════════════════════════

interface CoverageRow {
  category: string
  current: number
  target: number
  gap: number
  newApproved: number
  duplicates: number
  maybes: number
}

function buildCoverageReport(
  existing: ExistingVenue[],
  results: DedupResult[]
): CoverageRow[] {
  const countByCategory: Record<string, number> = {}
  for (const v of existing) {
    countByCategory[v.category.slug] = (countByCategory[v.category.slug] || 0) + 1
  }

  const newByCategory: Record<string, number> = {}
  const dupByCategory: Record<string, number> = {}
  const maybeByCategory: Record<string, number> = {}
  for (const r of results) {
    const cat = r.candidate.categorySlug
    if (r.classification === "new") newByCategory[cat] = (newByCategory[cat] || 0) + 1
    else if (r.classification === "duplicate") dupByCategory[cat] = (dupByCategory[cat] || 0) + 1
    else maybeByCategory[cat] = (maybeByCategory[cat] || 0) + 1
  }

  const rows: CoverageRow[] = []
  const allCats = new Set([
    ...Object.keys(CATEGORY_TARGETS),
    ...Object.keys(countByCategory),
  ])

  for (const cat of [...allCats].sort()) {
    const current = countByCategory[cat] || 0
    const target = CATEGORY_TARGETS[cat] || current
    rows.push({
      category: cat,
      current,
      target,
      gap: Math.max(0, target - current),
      newApproved: newByCategory[cat] || 0,
      duplicates: dupByCategory[cat] || 0,
      maybes: maybeByCategory[cat] || 0,
    })
  }

  return rows
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
  const [command, filePath] = process.argv.slice(2)
  const isLive = process.argv.includes("--live")

  if (!command || !["audit", "check", "enrich", "import"].includes(command)) {
    console.log(`
Usage:
  npx tsx scripts/dedup-engine.ts audit              Coverage report
  npx tsx scripts/dedup-engine.ts check  FILE.json   Check candidates (no Google)
  npx tsx scripts/dedup-engine.ts enrich FILE.json   Check + Google Places enrichment
  npx tsx scripts/dedup-engine.ts import FILE.json   Enrich + insert new into DB
  npx tsx scripts/dedup-engine.ts import FILE.json --live  Actually write to DB
`)
    process.exit(0)
  }

  console.log("╔══════════════════════════════════════════════════════════════╗")
  console.log("║    PATTAYA VICE CITY — Deduplication Engine v2.0            ║")
  console.log("╚══════════════════════════════════════════════════════════════╝")
  console.log(`  Command: ${command}`)
  if (filePath) console.log(`  Input:   ${filePath}`)
  if (command === "import") console.log(`  Mode:    ${isLive ? "LIVE — will insert into DB" : "DRY RUN"}`)
  console.log()

  // ─── Load existing venues ──────────────────────────────────
  console.log("📂 Loading existing venues from database...")
  const rawVenues = await prisma.venue.findMany({
    select: {
      id: true, slug: true, name: true, address: true, district: true,
      phone: true, website: true, facebook: true, instagram: true,
      lat: true, lng: true,
      category: { select: { slug: true } },
    },
  })

  const existing: ExistingVenue[] = rawVenues.map(v => ({
    ...v,
    _normName: normalizeName(v.name),
    _normPhone: normalizePhone(v.phone),
    _domain: extractDomain(v.website),
    _normFb: normalizeSocial(v.facebook),
    _normIg: normalizeSocial(v.instagram),
  }))

  console.log(`  → ${existing.length} venues loaded\n`)

  // ─── Audit mode ────────────────────────────────────────────
  if (command === "audit") {
    const coverage = buildCoverageReport(existing, [])
    printCoverage(coverage)
    await prisma.$disconnect()
    return
  }

  // ─── Load candidates ───────────────────────────────────────
  if (!filePath) {
    console.error("ERROR: input file required for this command")
    process.exit(1)
  }

  console.log(`📂 Loading candidates from ${filePath}...`)
  const candidates = parseCandidates(filePath)
  console.log(`  → ${candidates.length} candidates loaded\n`)

  // ─── Enrich with Google Places ─────────────────────────────
  if (command === "enrich" || command === "import") {
    if (!API_KEY) {
      console.log("⚠️  GOOGLE_MAPS_KEY not set — skipping enrichment\n")
    } else {
      console.log("🔍 Enriching candidates with Google Places API...")
      let enriched = 0, closed = 0, notFound = 0
      for (let i = 0; i < candidates.length; i++) {
        process.stdout.write(`  [${i + 1}/${candidates.length}] "${candidates[i].name}"...`)
        await enrichCandidate(candidates[i])
        if (candidates[i]._closedPermanently) {
          console.log(" ❌ PERMANENTLY CLOSED")
          closed++
        } else if (candidates[i]._googleNotFound) {
          console.log(" ⚠️  Not found on Google")
          notFound++
        } else {
          console.log(` ✓ ★${candidates[i]._googleRating || "?"} (${candidates[i]._googleReviews || 0} reviews)`)
          enriched++
        }
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
      }
      console.log(`\n  Enriched: ${enriched} | Not found: ${notFound} | Closed: ${closed}\n`)
    }
  }

  // ─── Filter out permanently closed ─────────────────────────
  const activeCandidates = candidates.filter(c => !c._closedPermanently)

  // ─── Score all candidates ──────────────────────────────────
  console.log("🔎 Scoring candidates against existing database...\n")
  const results: DedupResult[] = []

  for (const candidate of activeCandidates) {
    const result = scoreCandidate(candidate, existing)
    results.push(result)

    const icon = result.classification === "new" ? "🆕" :
      result.classification === "duplicate" ? "🔴" :
      result.classification === "maybe_duplicate" ? "🟡" : "🟠"

    console.log(`  ${icon} [${result.classification.padEnd(16)}] "${candidate.name}" (${candidate.categorySlug})`)
    if (result.bestMatch) {
      console.log(`     └─ best match: "${result.bestMatch.venue.name}" (${result.bestMatch.venue.category}) — score ${result.totalScore.toFixed(3)}`)
    }
    if (result.matchDetails.length > 0) {
      for (const d of result.matchDetails) {
        console.log(`        • ${d.field}: ${d.detail}`)
      }
    }
  }

  // ─── Summary ───────────────────────────────────────────────
  const counts = { new: 0, duplicate: 0, maybe_duplicate: 0, needs_review: 0 }
  for (const r of results) counts[r.classification]++

  console.log("\n══════════════════════════════════════════════════════════════")
  console.log("  DEDUPLICATION SUMMARY")
  console.log("══════════════════════════════════════════════════════════════")
  console.log(`  🆕 New (approved):      ${counts.new}`)
  console.log(`  🔴 Duplicate (blocked): ${counts.duplicate}`)
  console.log(`  🟡 Maybe duplicate:     ${counts.maybe_duplicate}`)
  console.log(`  🟠 Needs review:        ${counts.needs_review}`)
  console.log(`  📊 Total candidates:    ${results.length}`)
  console.log()

  // ─── Coverage report ───────────────────────────────────────
  const coverage = buildCoverageReport(existing, results)
  printCoverage(coverage)

  // ─── Save report ───────────────────────────────────────────
  const reportDir = join(process.cwd(), "data")
  mkdirSync(reportDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const reportPath = join(reportDir, `dedup-report-${timestamp}.json`)

  const report = {
    generatedAt: new Date().toISOString(),
    command,
    summary: counts,
    coverage,
    results: results.map(r => ({
      name: r.candidate.name,
      categorySlug: r.candidate.categorySlug,
      classification: r.classification,
      score: r.totalScore,
      bestMatch: r.bestMatch,
      matchDetails: r.matchDetails.map(d => ({ field: d.field, score: d.score, detail: d.detail })),
      reason: r.reason,
      // Include enriched data
      address: r.candidate.address,
      district: r.candidate.district,
      lat: r.candidate.lat,
      lng: r.candidate.lng,
      phone: r.candidate.phone,
      website: r.candidate.website,
      googleRating: r.candidate._googleRating,
      googleReviews: r.candidate._googleReviews,
      googlePlaceId: r.candidate._googlePlaceId,
    })),
    rejected: results.filter(r => r.classification !== "new").map(r => ({
      name: r.candidate.name,
      reason: r.reason,
      score: r.totalScore,
    })),
  }

  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n💾 Report saved to ${reportPath}`)

  // ─── Also save approved candidates as importable JSON ──────
  const approvedPath = join(reportDir, `approved-spots-${timestamp}.json`)
  const approved = results
    .filter(r => r.classification === "new")
    .map(r => r.candidate)
  writeFileSync(approvedPath, JSON.stringify(approved, null, 2))
  console.log(`📋 Approved spots (${approved.length}) saved to ${approvedPath}`)

  // ─── Import into DB ────────────────────────────────────────
  if (command === "import") {
    if (!isLive) {
      console.log("\n🔒 DRY RUN — no database changes. Use --live to insert.")
    } else {
      console.log(`\n🚀 Inserting ${approved.length} approved spots into database...`)
      const slugToId: Record<string, string> = {}
      const dbCats = await prisma.category.findMany()
      for (const cat of dbCats) slugToId[cat.slug] = cat.id

      let created = 0, failed = 0
      for (const spot of approved) {
        const categoryId = slugToId[spot.categorySlug]
        if (!categoryId) {
          console.log(`  ⚠️  "${spot.name}" — category "${spot.categorySlug}" not found, skipping`)
          failed++
          continue
        }

        // Double-check not already in DB (race condition protection)
        const existingCheck = await prisma.venue.findFirst({
          where: { name: { equals: spot.name, mode: "insensitive" } },
          select: { id: true },
        })
        if (existingCheck) {
          console.log(`  ⏭️  "${spot.name}" — appeared in DB since check, skipping`)
          continue
        }

        let venueSlug = makeSlug(spot.name)
        let counter = 1
        while (await prisma.venue.findUnique({ where: { slug: venueSlug } })) {
          venueSlug = `${makeSlug(spot.name)}-${counter++}`
        }

        try {
          await prisma.venue.create({
            data: {
              name: spot.name,
              slug: venueSlug,
              categoryId,
              description: spot.description || null,
              address: spot.address || null,
              district: spot.district || null,
              city: "Pattaya",
              lat: spot.lat || null,
              lng: spot.lng || null,
              phone: spot.phone || null,
              website: spot.website || null,
              isActive: true,
              isVerified: false,
            },
          })
          console.log(`  ✅ Created "${spot.name}" (${venueSlug})`)
          created++
        } catch (e: any) {
          console.error(`  ❌ Failed "${spot.name}": ${e.message}`)
          failed++
        }
      }

      console.log(`\n  Created: ${created} | Failed: ${failed}`)
    }
  }

  await prisma.$disconnect()
}

// ─── Display helpers ─────────────────────────────────────────

function printCoverage(coverage: CoverageRow[]) {
  console.log("══════════════════════════════════════════════════════════════")
  console.log("  COVERAGE REPORT")
  console.log("══════════════════════════════════════════════════════════════")
  console.log(`  ${"Category".padEnd(22)} ${"Now".padStart(4)} ${"Target".padStart(6)} ${"Gap".padStart(4)} ${"New".padStart(4)} ${"Dup".padStart(4)} ${"Maybe".padStart(5)}`)
  console.log(`  ${"─".repeat(22)} ${"─".repeat(4)} ${"─".repeat(6)} ${"─".repeat(4)} ${"─".repeat(4)} ${"─".repeat(4)} ${"─".repeat(5)}`)

  let totalCurrent = 0, totalTarget = 0, totalGap = 0, totalNew = 0, totalDup = 0, totalMaybe = 0

  for (const row of coverage) {
    const marker = row.gap > 5 ? " ⚠️" : row.gap > 0 ? " ◻" : " ✅"
    console.log(`  ${row.category.padEnd(22)} ${String(row.current).padStart(4)} ${String(row.target).padStart(6)} ${String(row.gap).padStart(4)} ${String(row.newApproved).padStart(4)} ${String(row.duplicates).padStart(4)} ${String(row.maybes).padStart(5)}${marker}`)
    totalCurrent += row.current
    totalTarget += row.target
    totalGap += row.gap
    totalNew += row.newApproved
    totalDup += row.duplicates
    totalMaybe += row.maybes
  }

  console.log(`  ${"─".repeat(22)} ${"─".repeat(4)} ${"─".repeat(6)} ${"─".repeat(4)} ${"─".repeat(4)} ${"─".repeat(4)} ${"─".repeat(5)}`)
  console.log(`  ${"TOTAL".padEnd(22)} ${String(totalCurrent).padStart(4)} ${String(totalTarget).padStart(6)} ${String(totalGap).padStart(4)} ${String(totalNew).padStart(4)} ${String(totalDup).padStart(4)} ${String(totalMaybe).padStart(5)}`)
  console.log()
}

main().catch(e => {
  console.error("Fatal error:", e)
  process.exit(1)
})
