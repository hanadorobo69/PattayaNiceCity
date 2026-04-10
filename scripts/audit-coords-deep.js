const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const all = await p.venue.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, lat: true, lng: true, address: true, district: true },
  })

  const noCoords = all.filter(v => !v.lat || !v.lng)
  const withCoords = all.filter(v => v.lat && v.lng)
  console.log("Total active:", all.length)
  console.log("With coordinates:", withCoords.length)
  console.log("Without coordinates:", noCoords.length)

  // Find duplicate coordinates (3+ venues at same point)
  const coordMap = {}
  for (const v of withCoords) {
    const key = v.lat + "," + v.lng
    if (!coordMap[key]) coordMap[key] = []
    coordMap[key].push(v)
  }
  const dupes = Object.entries(coordMap).filter(([k, v]) => v.length > 2)
  console.log("\n=== COORDINATE CLUSTERS (3+ venues at exact same point) ===")
  for (const [coord, venues] of dupes) {
    console.log("\n  " + coord + " (" + venues.length + " venues):")
    for (const v of venues) console.log("    - " + v.name + " [" + (v.district || "no-district") + "]")
  }

  // Venues with suspiciously round coords (< 3 decimal places)
  const round = withCoords.filter(v => {
    const latDec = String(v.lat).split(".")[1] || ""
    const lngDec = String(v.lng).split(".")[1] || ""
    return latDec.length <= 3 || lngDec.length <= 3
  })
  console.log("\n=== SUSPICIOUSLY ROUND COORDINATES ===")
  for (const v of round) console.log("  " + v.name + ": " + v.lat + ", " + v.lng)

  // Venues in the Soi 6 area with oddly low precision (batch import artifacts)
  const soi6 = withCoords.filter(v => v.district === "soi-6")
  const soi6LowPrec = soi6.filter(v => {
    const latDec = String(v.lat).split(".")[1] || ""
    const lngDec = String(v.lng).split(".")[1] || ""
    return latDec.length <= 4 || lngDec.length <= 4
  })
  console.log("\n=== SOI 6 LOW PRECISION COORDS ===")
  for (const v of soi6LowPrec) console.log("  " + v.name + ": " + v.lat + ", " + v.lng)

  // Walking Street low precision
  const ws = withCoords.filter(v => v.district === "walking-street")
  const wsLowPrec = ws.filter(v => {
    const latDec = String(v.lat).split(".")[1] || ""
    const lngDec = String(v.lng).split(".")[1] || ""
    return latDec.length <= 4 || lngDec.length <= 4
  })
  console.log("\n=== WALKING STREET LOW PRECISION COORDS ===")
  for (const v of wsLowPrec) console.log("  " + v.name + ": " + v.lat + ", " + v.lng)

  // All venues sorted by longitude ascending (first 50)
  const byLng = [...withCoords].sort((a, b) => a.lng - b.lng)
  console.log("\n=== 15 WESTMOST VENUES (lowest longitude) ===")
  for (const v of byLng.slice(0, 15)) {
    console.log("  " + v.name + " — " + v.lat + ", " + v.lng + " — " + (v.district || "none"))
  }

  await p.$disconnect()
}

main().catch(console.error)
