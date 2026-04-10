const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const venues = await p.venue.findMany({
    where: { isActive: true, lat: { not: null }, lng: { not: null } },
    select: { district: true, lat: true, lng: true, name: true, id: true },
  })

  // Group by district - get coordinate ranges
  const districts = {}
  for (const v of venues) {
    const d = v.district || "__NONE__"
    if (!districts[d]) districts[d] = { lats: [], lngs: [], count: 0, venues: [] }
    districts[d].lats.push(v.lat)
    districts[d].lngs.push(v.lng)
    districts[d].count++
    districts[d].venues.push(v)
  }

  console.log("=== DISTRICT COORDINATE RANGES ===\n")
  for (const [d, data] of Object.entries(districts).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (d === "__NONE__" || d === "n-a") continue
    const minLat = Math.min(...data.lats).toFixed(6)
    const maxLat = Math.max(...data.lats).toFixed(6)
    const minLng = Math.min(...data.lngs).toFixed(6)
    const maxLng = Math.max(...data.lngs).toFixed(6)
    const avgLat = (data.lats.reduce((a, b) => a + b, 0) / data.lats.length).toFixed(6)
    const avgLng = (data.lngs.reduce((a, b) => a + b, 0) / data.lngs.length).toFixed(6)
    console.log(`${d} (${data.count})`)
    console.log(`  lat: ${minLat} — ${maxLat}  (avg ${avgLat})`)
    console.log(`  lng: ${minLng} — ${maxLng}  (avg ${avgLng})`)
  }

  // List venues without district (or n-a) that have coords
  const noDistrict = venues.filter(v => !v.district || v.district === "n-a")
  console.log(`\n=== VENUES WITHOUT DISTRICT (with coords): ${noDistrict.length} ===\n`)
  for (const v of noDistrict.sort((a, b) => a.lat - b.lat)) {
    console.log(`  ${v.name} | lat=${v.lat}, lng=${v.lng} | id=${v.id}`)
  }

  await p.$disconnect()
}

main().catch(console.error)
