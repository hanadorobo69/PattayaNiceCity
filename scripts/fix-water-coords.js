const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

// Check if venue coords are clearly in the water
function isInWater(lat, lng) {
  if (!lat || !lng) return false
  if (lat >= 12.955 && lng < 100.870) return true
  if (lat >= 12.925 && lat < 12.955 && lng < 100.865) return true
  if (lat >= 12.91 && lat < 12.925 && lng < 100.860) return true
  if (lat >= 12.90 && lat < 12.91 && lng < 100.855) return true
  if (lat >= 12.87 && lat < 12.90 && lng < 100.860) return true
  if (lat < 12.87 && lng < 100.865) return true
  return false
}

// Check if coordinates are low precision (fabricated/estimated)
function isLowPrecision(lat, lng) {
  const latDec = String(lat).split(".")[1] || ""
  const lngDec = String(lng).split(".")[1] || ""
  // If either lat or lng has fewer than 5 decimal places, it's likely fabricated
  return latDec.length < 5 || lngDec.length < 5
}

async function main() {
  const venues = await p.venue.findMany({
    where: { isActive: true, lat: { not: null }, lng: { not: null } },
    select: { id: true, name: true, slug: true, lat: true, lng: true, district: true },
  })

  const toFix = []

  for (const v of venues) {
    const inWater = isInWater(v.lat, v.lng)
    const lowPrec = isLowPrecision(v.lat, v.lng)

    if (inWater || lowPrec) {
      toFix.push({
        ...v,
        reason: inWater ? "IN_WATER" : "LOW_PRECISION",
      })
    }
  }

  console.log(`Total venues with coords: ${venues.length}`)
  console.log(`Venues to fix: ${toFix.length}`)
  console.log(`  - In water: ${toFix.filter(v => v.reason === "IN_WATER").length}`)
  console.log(`  - Low precision: ${toFix.filter(v => v.reason === "LOW_PRECISION").length}`)
  console.log()

  // Group by reason
  for (const reason of ["IN_WATER", "LOW_PRECISION"]) {
    const group = toFix.filter(v => v.reason === reason)
    console.log(`=== ${reason} (${group.length}) ===`)
    for (const v of group) {
      console.log(`  ${v.name} — ${v.lat}, ${v.lng} — ${v.district || "none"}`)
    }
    console.log()
  }

  // Actually remove the coordinates
  console.log("Removing coordinates...")
  let count = 0
  for (const v of toFix) {
    await p.venue.update({
      where: { id: v.id },
      data: { lat: null, lng: null },
    })
    count++
  }
  console.log(`Done! Removed coordinates from ${count} venues.`)
  console.log(`Remaining venues with coordinates: ${venues.length - count}`)

  await p.$disconnect()
}

main().catch(console.error)
