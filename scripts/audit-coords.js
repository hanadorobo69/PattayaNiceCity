const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

// Pattaya coastline check — Pattaya Bay faces WEST
// The coast longitude varies by latitude
function isLikelyInWater(lat, lng) {
  if (!lat || !lng) return false

  // Way outside Pattaya area
  if (lat < 12.70 || lat > 13.10 || lng < 100.80 || lng > 101.00) return true

  // North Pattaya / Naklua (lat > 12.955): coast ~100.875
  if (lat >= 12.955 && lng < 100.870) return true

  // Central Pattaya (lat 12.925 - 12.955): coast ~100.867
  if (lat >= 12.925 && lat < 12.955 && lng < 100.865) return true

  // South Pattaya / Walking Street (lat 12.91 - 12.925): coast ~100.862
  if (lat >= 12.91 && lat < 12.925 && lng < 100.860) return true

  // Pratumnak (lat 12.90 - 12.91): coast ~100.858
  if (lat >= 12.90 && lat < 12.91 && lng < 100.855) return true

  // Jomtien (lat 12.87 - 12.90): coast ~100.862
  if (lat >= 12.87 && lat < 12.90 && lng < 100.860) return true

  // South Jomtien (lat < 12.87): coast ~100.870
  if (lat < 12.87 && lng < 100.865) return true

  return false
}

async function main() {
  const venues = await prisma.venue.findMany({
    where: { isActive: true, lat: { not: null }, lng: { not: null } },
    select: { id: true, name: true, slug: true, lat: true, lng: true, address: true, district: true },
    orderBy: { name: "asc" },
  })

  console.log(`Total venues with coordinates: ${venues.length}\n`)

  const inWater = []
  for (const v of venues) {
    if (isLikelyInWater(v.lat, v.lng)) {
      inWater.push(v)
    }
  }

  console.log(`=== VENUES LIKELY IN WATER (${inWater.length}) ===\n`)
  for (const v of inWater) {
    console.log(`  ${v.name}`)
    console.log(`    lat=${v.lat}, lng=${v.lng}`)
    console.log(`    address: ${v.address || "none"}`)
    console.log(`    district: ${v.district || "none"}`)
    console.log(`    id: ${v.id}`)
    console.log()
  }

  // Show the 30 lowest longitude venues for context
  const sorted = [...venues].sort((a, b) => (a.lng || 999) - (b.lng || 999))
  console.log(`\n=== 30 LOWEST LONGITUDE VENUES ===\n`)
  for (const v of sorted.slice(0, 30)) {
    const flag = isLikelyInWater(v.lat, v.lng) ? "WATER" : "OK"
    console.log(`  [${flag}] ${v.name} — lat=${v.lat}, lng=${v.lng} — ${v.district || "no-district"}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
