import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function main() {
  // 1. Rename "GoGo Club" / "GoGo Bar" category to "GoGo"
  const updated = await prisma.category.updateMany({
    where: { slug: "gogo-bar" },
    data: { name: "GoGo" },
  })
  console.log(`Updated gogo-bar category name: ${updated.count} row(s)`)

  // 2. Export all venues with full details
  const venues = await prisma.venue.findMany({
    include: { category: true },
    orderBy: [{ category: { slug: "asc" } }, { name: "asc" }],
  })

  const byCategory: Record<string, number> = {}
  const venueData = venues.map((v) => {
    const catSlug = v.category.slug
    byCategory[catSlug] = (byCategory[catSlug] || 0) + 1

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      category: catSlug,
      categoryName: v.category.name,
      address: v.address,
      district: v.district,
      city: v.city,
      phone: v.phone,
      phoneType: v.phoneType,
      whatsapp: v.whatsapp,
      lineId: v.lineId,
      website: v.website,
      facebook: v.facebook,
      instagram: v.instagram,
      hours: v.hours,
      lat: v.lat,
      lng: v.lng,
      imageUrl: v.imageUrl,
      isActive: v.isActive,
      isVerified: v.isVerified,
      isRecommended: v.isRecommended,
      permanentlyClosed: v.permanentlyClosed,
      needsVerification: v.needsVerification,
      priceRange: v.priceRange,
      // Pricing
      priceSoftDrink: v.priceSoftDrink,
      priceBeerMin: v.priceBeerMin,
      priceBeerMax: v.priceBeerMax,
      priceAlcoholMin: v.priceAlcoholMin,
      priceAlcoholMax: v.priceAlcoholMax,
      priceLadyDrink: v.priceLadyDrink,
      priceBottleMin: v.priceBottleMin,
      priceBottleMax: v.priceBottleMax,
      priceBarfineMin: v.priceBarfineMin,
      priceBarfineMax: v.priceBarfineMax,
      priceShortTimeMin: v.priceShortTimeMin,
      priceShortTimeMax: v.priceShortTimeMax,
      priceLongTimeMin: v.priceLongTimeMin,
      priceLongTimeMax: v.priceLongTimeMax,
      priceRoomSmall: v.priceRoomSmall,
      priceRoomLarge: v.priceRoomLarge,
      priceThaiMassage: v.priceThaiMassage,
      priceFootMassage: v.priceFootMassage,
      priceOilMassage: v.priceOilMassage,
      // Amenities
      hasPool: v.hasPool,
      hasDarts: v.hasDarts,
      hasConnect4: v.hasConnect4,
      hasBeerPong: v.hasBeerPong,
      hasWifi: v.hasWifi,
      hasTV: v.hasTV,
      // Geometry
      geometryType: v.geometryType,
      geometryPath: v.geometryPath,
      areaRadius: v.areaRadius,
      // Timestamps
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }
  })

  const output = {
    exportedAt: new Date().toISOString(),
    totalVenues: venues.length,
    byCategory,
    venues: venueData,
  }

  const outPath = path.join(__dirname, "..", "venues.json")
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`Exported ${venues.length} venues to venues.json`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
