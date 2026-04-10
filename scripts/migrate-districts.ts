/**
 * Migrate venue districts to standardized district IDs.
 * Maps existing free-text districts to our DISTRICTS list,
 * and sets "n-a" for venues that don't match any known district.
 *
 * Usage: npx tsx scripts/migrate-districts.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Mapping from existing DB values to our standardized district IDs
const DISTRICT_MAP: Record<string, string> = {
  // Walking Street
  "Walking Street": "walking-street",
  "walking-street": "walking-street",

  // Soi 6
  "Soi 6": "soi-6",
  "soi-6": "soi-6",

  // Jomtien
  "Jomtien": "jomtien",
  "Thappraya / Jomtien": "jomtien",

  // Pratumnak (note: some venues have "Pratamnak" typo)
  "Pratamnak": "pratumnak",
  "Pratumnak": "pratumnak",

  // Pattaya Beach
  "Pattaya Beach": "pattaya-beach",
  "Beach Road": "pattaya-beach",
  "Soi 8 / Beach Road": "pattaya-beach",

  // Tree Town (Soi Buakhao area)
  "Tree Town": "tree-town",
  "Soi Buakhao / Tree Town": "tree-town",
  "Soi Buakhao": "tree-town",
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  if (dryRun) console.log("=== DRY RUN MODE ===\n")

  const venues = await prisma.venue.findMany({
    select: { id: true, name: true, district: true },
    orderBy: { name: "asc" },
  })

  let mapped = 0
  let setNA = 0
  let alreadyOk = 0
  let skipped = 0

  const VALID_IDS = new Set([
    "walking-street", "walking-street-jomtien", "soi-6", "tree-town",
    "jomtien", "pratumnak", "pattaya-beach", "n-a",
  ])

  for (const venue of venues) {
    const current = venue.district

    // Already a valid district ID
    if (current && VALID_IDS.has(current)) {
      alreadyOk++
      continue
    }

    // Try to map
    const mappedId = current ? DISTRICT_MAP[current] : null

    if (mappedId) {
      console.log(`MAP: "${venue.name}" - "${current}" -> "${mappedId}"`)
      if (!dryRun) {
        await prisma.venue.update({ where: { id: venue.id }, data: { district: mappedId } })
      }
      mapped++
    } else {
      // No match -> set to N/A
      console.log(`N/A: "${venue.name}" - district was: "${current || "(empty)}"`)
      if (!dryRun) {
        await prisma.venue.update({ where: { id: venue.id }, data: { district: "n-a" } })
      }
      setNA++
    }
  }

  console.log("\n=== SUMMARY ===")
  console.log("Total venues: " + venues.length)
  console.log("Already correct: " + alreadyOk)
  console.log("Mapped to known district: " + mapped)
  console.log("Set to N/A: " + setNA)
  if (dryRun) console.log("\nThis was a DRY RUN. Run without --dry-run to apply changes.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
