/**
 * Restore imageUrl from venues.json for all venues that were wrongly reverted.
 * Only keep null for the ~25 venues that got photos from enrich-all.
 * Also delete closed venues and create ladyboy freelance area.
 */

import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

// These venues got imageUrl FROM enrich-all - they should stay null
const ENRICH_ALL_PHOTO_VENUES = new Set([
  "blow thailand",
  "burirom health massage",
  "d.i.b sky bar",
  "exotica",
  "happy cannabis",
  "hqc - high quality cannabis",
  "hops brew house",
  "jomtien health massage",
  "king kong",
  "la vela rooftop bar",
  "lk metropole hotel",
  "manuya",
  "moom talay rooftop",
  "n2 pattaya resort",
  "nuru house pattaya",
  "pasadena lodge hotel",
  "pattaya",
  "q resort 24 hours",
  "sansuk sauna & guesthouse",
  "skybar summer club",
  "tea tree spa",
  "the roof sky bar",
  "the sky 32",
  "virgin rooftop pattaya",
  "wonder weed pattaya",
])

const CLOSED_VENUES = [
  "Green Bike Bar",
  "Living Dolls aGoGo",
  "Peppermint A Go Go",
  "Tantra A Go Go",
  "The Blues Factory",
  "The Burj Club Pattaya",
]

async function main() {
  // ---- TASK 1: Restore imageUrl from venues.json ----
  console.log("=== TASK 1: Restoring imageUrl from venues.json ===\n")

  const venuesJson = JSON.parse(readFileSync(join(__dirname, "..", "venues.json"), "utf-8"))
  const venueData = venuesJson.venues

  let restored = 0
  let keptNull = 0

  for (const v of venueData) {
    if (!v.imageUrl) continue // nothing to restore

    const nameLower = v.name.toLowerCase()

    // Skip venues that should stay null (enrich-all photos to remove)
    if (ENRICH_ALL_PHOTO_VENUES.has(nameLower)) {
      keptNull++
      continue
    }

    // Check current DB state
    const dbVenue = await prisma.venue.findFirst({
      where: { name: { equals: v.name, mode: "insensitive" } },
      select: { id: true, name: true, imageUrl: true },
    })

    if (!dbVenue) continue

    // Only restore if currently null (was wrongly reverted)
    if (!dbVenue.imageUrl) {
      await prisma.venue.update({
        where: { id: dbVenue.id },
        data: { imageUrl: v.imageUrl },
      })
      restored++
      if (restored <= 30) console.log(`  Restored: ${dbVenue.name} -> ${v.imageUrl}`)
    }
  }

  if (restored > 30) console.log(`  ... and ${restored - 30} more`)
  console.log(`\nRestored ${restored} venues, kept ${keptNull} null (enrich-all photos)\n`)

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
    // Delete any reviews/favorites etc
    try { await prisma.$executeRaw`DELETE FROM "Review" WHERE "venueId" = ${venue.id}` } catch {}
    try { await prisma.$executeRaw`DELETE FROM "Favorite" WHERE "venueId" = ${venue.id}` } catch {}
    await prisma.venue.delete({ where: { id: venue.id } })
    console.log(`  DELETED: ${venue.name}`)
  }

  // ---- TASK 3: Add ladyboy freelance area on Soi Buakhao ----
  console.log("\n=== TASK 3: Adding ladyboy freelance area on Soi Buakhao ===\n")

  const category = await prisma.category.findUnique({
    where: { slug: "ladyboy-freelance" },
  })

  if (!category) {
    console.log("ERROR: ladyboy-freelance category not found!")
    return
  }

  const existing = await prisma.venue.findFirst({
    where: { slug: "soi-buakhao-ladyboy-freelance" },
  })

  if (existing) {
    console.log("Already exists, skipping")
  } else {
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
  const noImage = await prisma.venue.count({ where: { isActive: true, OR: [{ imageUrl: null }, { imageUrl: "" }] } })
  console.log(`\nTotal venues: ${total}`)
  console.log(`Needing verification: ${needsVerif}`)
  console.log(`Missing image: ${noImage}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
