/**
 * Insert verified venues into the database.
 * - Creates Cabaret category if needed
 * - Inserts batch 1 (new-venues-verified.json) + batch 2 (discovered-venues-google.json)
 * - Uses Google Places lat/lng
 * - Sets needsVerification = true so admin can review
 */

import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

function makeSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function uniqueSlug(base) {
  let slug = base
  let counter = 1
  while (await prisma.venue.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

// Map venue type to category slug
const TYPE_TO_CATEGORY = {
  "gogo-bar": "gogo-bar",
  "girly-bar": "girly-bar",
  "gentlemans-club": "gentlemans-club",
  "ladyboy-bar": "ladyboy-bar",
  "ladyboy-gogo": "ladyboy-gogo",
  "gay-bar": "gay-bar",
  "gay-gogo": "gay-gogo",
  "bj-bar": "bj-bar",
  "russian-gogo": "russian-gogo",
  "cabaret": "cabaret",
}

async function main() {
  // 1. Create Cabaret category if it doesn't exist
  console.log("Checking/creating Cabaret category...")
  let cabaretCat = await prisma.category.findUnique({ where: { slug: "cabaret" } })
  if (!cabaretCat) {
    cabaretCat = await prisma.category.create({
      data: {
        name: "Cabaret",
        slug: "cabaret",
        description: "Cabaret shows and performances",
        color: "#D946EF",
        icon: "🎪",
        sortOrder: 19,
      },
    })
    console.log("  Created Cabaret category")
  } else {
    console.log("  Cabaret category already exists")
  }

  // 2. Also ensure girly-bar category exists
  let girlyBarCat = await prisma.category.findUnique({ where: { slug: "girly-bar" } })
  if (!girlyBarCat) {
    girlyBarCat = await prisma.category.create({
      data: {
        name: "Girly Bar",
        slug: "girly-bar",
        description: "Beer bars with hostesses",
        color: "#F472B6",
        icon: "🍹",
        sortOrder: 1,
      },
    })
    console.log("  Created Girly Bar category")
  }

  // 3. Load category map
  const allCategories = await prisma.category.findMany()
  const catMap = new Map(allCategories.map((c) => [c.slug, c.id]))

  // 4. Load batch 1
  const batch1Data = JSON.parse(readFileSync(join(__dirname, "..", "data", "new-venues-verified.json"), "utf-8"))
  const batch1 = batch1Data.verified.map((v) => ({
    name: v.name,
    type: v.type,
    zone: v.zone,
    lat: v.google?.lat || null,
    lng: v.google?.lng || null,
    address: v.google?.formatted_address || v.address || null,
  }))

  // 5. Load batch 2
  const batch2Data = JSON.parse(readFileSync(join(__dirname, "..", "data", "discovered-venues-google.json"), "utf-8"))
  const batch2 = batch2Data.venues.map((v) => ({
    name: v.name,
    type: v.type,
    zone: v.zone,
    lat: v.google?.lat || null,
    lng: v.google?.lng || null,
    address: v.google?.formatted_address || null,
  }))

  const allVenues = [...batch1, ...batch2]
  console.log(`\nInserting ${allVenues.length} venues (${batch1.length} batch1 + ${batch2.length} batch2)...\n`)

  let inserted = 0
  let skipped = 0

  for (const venue of allVenues) {
    const categorySlug = TYPE_TO_CATEGORY[venue.type]
    const categoryId = catMap.get(categorySlug)

    if (!categoryId) {
      console.log(`  SKIP (no category for "${venue.type}"): ${venue.name}`)
      skipped++
      continue
    }

    // Check if venue already exists by name (case-insensitive)
    const existing = await prisma.venue.findFirst({
      where: { name: { equals: venue.name, mode: "insensitive" } },
    })

    if (existing) {
      console.log(`  SKIP (already exists): ${venue.name}`)
      skipped++
      continue
    }

    const slug = await uniqueSlug(makeSlug(venue.name))

    try {
      await prisma.venue.create({
        data: {
          name: venue.name,
          slug,
          categoryId,
          district: venue.zone || null,
          address: venue.address || null,
          city: "Pattaya",
          lat: venue.lat || null,
          lng: venue.lng || null,
          isActive: true,
          isVerified: false,
          needsVerification: true,
          priceRange: "$$",
        },
      })
      inserted++
      console.log(`  OK: ${venue.name} (${categorySlug}) - ${venue.zone}`)
    } catch (err) {
      console.log(`  ERROR: ${venue.name}: ${err.message}`)
      skipped++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped: ${skipped}`)

  // Count total venues now
  const total = await prisma.venue.count()
  console.log(`Total venues in DB: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
