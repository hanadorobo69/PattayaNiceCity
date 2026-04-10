/**
 * Cleanup script:
 * 1. Remove 119 photos added by enrich-all (revert imageUrl, delete VenueMedia)
 * 2. Delete 6 permanently closed venues
 * 3. Add ladyboy freelance area on Soi Buakhao
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Venues that got imageUrl from enrich-all (NOT the 44 new ones)
const PHOTO_REVERT_NAMES = [
  "Blow Thailand",
  "Burirom Health Massage",
  "D.I.B Sky Bar",
  "Exotica",
  "Happy Cannabis",
  "HQC - High Quality Cannabis",
  "Hops Brew House",
  "Jomtien Health Massage",
  "King Kong",
  "La Vela Rooftop Bar",
  "LK Metropole Hotel",
  "Manuya",
  "Moom Talay Rooftop",
  "N2 Pattaya Resort",
  "Nuru House Pattaya",
  "Pasadena Lodge Hotel",
  "Pattaya",
  "Q Resort 24 Hours",
  "Sansuk Sauna & Guesthouse",
  "Skybar Summer Club",
  "Tea Tree Spa",
  "The Roof Sky Bar",
  "The Sky 32",
  "Virgin Rooftop Pattaya",
  "Wonder Weed Pattaya",
]

const CLOSED_VENUES = [
  "Green Bike Bar",
  "Living Dolls aGoGo",
  "Peppermint A Go Go",
  "Tantra A Go Go",
  "The Blues Factory",
  "The Burj Club Pattaya",
]

async function main() {
  // ---- TASK 1: Remove photos from enrich-all ----
  console.log("=== TASK 1: Reverting photos from enrich-all ===\n")

  // Find all venues that got photos from enrich-all (needsVerification = false, imageUrl starts with /uploads/images/)
  // We target venues whose imageUrl was set by enrich-all - they have /uploads/images/ paths
  // and are NOT the 44 new venues (which have needsVerification = true)
  const photosToRevert = await prisma.venue.findMany({
    where: {
      needsVerification: false,
      imageUrl: { startsWith: "/uploads/images/" },
    },
    select: { id: true, name: true, imageUrl: true },
  })

  console.log(`Found ${photosToRevert.length} venues with enrich-all photos to revert`)

  for (const v of photosToRevert) {
    // Delete VenueMedia records
    const deleted = await prisma.venueMedia.deleteMany({
      where: { venueId: v.id },
    })

    // Null out imageUrl
    await prisma.venue.update({
      where: { id: v.id },
      data: { imageUrl: null },
    })

    console.log(`  Reverted: ${v.name} (removed ${deleted.count} media records)`)
  }

  console.log(`\nReverted ${photosToRevert.length} venues\n`)

  // ---- TASK 2: Delete permanently closed venues ----
  console.log("=== TASK 2: Deleting permanently closed venues ===\n")

  for (const name of CLOSED_VENUES) {
    const venue = await prisma.venue.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
    })

    if (!venue) {
      console.log(`  NOT FOUND: ${name}`)
      continue
    }

    // Delete related records first
    await prisma.venueMedia.deleteMany({ where: { venueId: venue.id } })
    await prisma.review.deleteMany({ where: { venueId: venue.id } })
    await prisma.venue.delete({ where: { id: venue.id } })
    console.log(`  DELETED: ${venue.name}`)
  }

  // ---- TASK 3: Add ladyboy freelance area on Soi Buakhao ----
  console.log("\n=== TASK 3: Adding ladyboy freelance area on Soi Buakhao ===\n")

  // Get the ladyboy-freelance category
  const category = await prisma.category.findUnique({
    where: { slug: "ladyboy-freelance" },
  })

  if (!category) {
    console.log("ERROR: ladyboy-freelance category not found!")
    return
  }

  // Check if it already exists
  const existing = await prisma.venue.findFirst({
    where: { slug: "soi-buakhao-ladyboy-freelance" },
  })

  if (existing) {
    console.log("Already exists, skipping")
  } else {
    // Polyline following Soi Buakhao from south to north
    // Start: 12.928761, 100.884790
    // End: 12.930135, 100.885680
    // Intermediate points following the road curve
    const geometryPath = JSON.stringify([
      [12.928761, 100.884790],
      [12.928850, 100.884830],
      [12.928950, 100.884880],
      [12.929050, 100.884940],
      [12.929150, 100.885000],
      [12.929250, 100.885060],
      [12.929350, 100.885130],
      [12.929450, 100.885200],
      [12.929550, 100.885270],
      [12.929650, 100.885340],
      [12.929750, 100.885410],
      [12.929850, 100.885480],
      [12.929950, 100.885560],
      [12.930050, 100.885620],
      [12.930135, 100.885680],
    ])

    await prisma.venue.create({
      data: {
        id: "fl-zone-buakhao-lb",
        name: "Soi Buakhao Ladyboy Freelance",
        slug: "soi-buakhao-ladyboy-freelance",
        categoryId: category.id,
        district: "soi-buakhao",
        address: "Soi Buakhao, Pattaya",
        city: "Pattaya",
        isActive: true,
        isVerified: true,
        needsVerification: false,
        geometryType: "polyline",
        geometryPath: geometryPath,
        zoneType: "street-strip",
        bestHours: "22:00-02:00",
      },
    })

    console.log("Created: Soi Buakhao Ladyboy Freelance (polyline, 15 points)")
  }

  // Final stats
  const total = await prisma.venue.count()
  const needsVerif = await prisma.venue.count({ where: { needsVerification: true } })
  console.log(`\nTotal venues in DB: ${total}`)
  console.log(`Venues needing verification: ${needsVerif}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
