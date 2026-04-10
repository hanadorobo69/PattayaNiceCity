const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

function guessDistrict(lat, lng) {
  // Far east = Darkside / East Pattaya → n-a
  if (lng > 100.905) return "n-a"

  // South: Jomtien
  if (lat < 12.910) return "jomtien"

  // Pratumnak hill area (between Walking Street and Jomtien, west side)
  if (lat >= 12.910 && lat < 12.924 && lng < 100.875) return "pratumnak"

  // Walking Street area
  if (lat >= 12.920 && lat < 12.930 && lng >= 100.868 && lng < 100.878) return "walking-street"

  // Bong Koch 8 area (small cluster east of center)
  if (lat >= 12.926 && lat < 12.932 && lng >= 100.889 && lng < 100.896) return "bong-koch-8"

  // Soi 6 area
  if (lat >= 12.940 && lat < 12.945 && lng >= 100.883 && lng < 100.892) return "soi-6"

  // South-central without district → pattaya-beach
  if (lat >= 12.910 && lat < 12.930 && lng >= 100.875 && lng <= 100.905) return "pattaya-beach"

  // Tree Town (central-east area)
  if (lat >= 12.925 && lat < 12.955 && lng >= 100.880 && lng <= 100.900) return "tree-town"

  // Central Pattaya west side → pattaya-beach
  if (lat >= 12.925 && lat < 12.960 && lng < 100.880) return "pattaya-beach"

  // North Pattaya / Naklua → n-a
  if (lat >= 12.955) return "n-a"

  // Fallback
  return "n-a"
}

async function main() {
  const venues = await p.venue.findMany({
    where: {
      isActive: true,
      lat: { not: null },
      lng: { not: null },
      OR: [
        { district: null },
        { district: "" },
        { district: "n-a" },
      ],
    },
    select: { id: true, name: true, lat: true, lng: true, district: true },
  })

  console.log(`Found ${venues.length} venues without a real district\n`)

  // Only assign to venues that currently have no district or "n-a"
  const assignments = []
  for (const v of venues) {
    const newDistrict = guessDistrict(v.lat, v.lng)
    if (newDistrict === "n-a") continue // Skip if we'd just assign n-a
    assignments.push({ ...v, newDistrict })
  }

  console.log(`Will assign districts to ${assignments.length} venues:\n`)

  // Group by new district for display
  const grouped = {}
  for (const a of assignments) {
    if (!grouped[a.newDistrict]) grouped[a.newDistrict] = []
    grouped[a.newDistrict].push(a)
  }

  for (const [district, vens] of Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`=== ${district} (${vens.length}) ===`)
    for (const v of vens) {
      console.log(`  ${v.name} — ${v.lat}, ${v.lng} (was: ${v.district || "null"})`)
    }
    console.log()
  }

  // Dry run check
  if (process.argv.includes("--apply")) {
    console.log("Applying changes...")
    let count = 0
    for (const a of assignments) {
      await p.venue.update({
        where: { id: a.id },
        data: { district: a.newDistrict },
      })
      count++
    }
    console.log(`Done! Updated ${count} venues.`)
  } else {
    console.log("DRY RUN — pass --apply to actually update the database")
  }

  await p.$disconnect()
}

main().catch(console.error)
