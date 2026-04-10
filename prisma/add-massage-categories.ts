import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Running DB migrations...");

  // Add priceThaiMassage column if it doesn't exist
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "priceThaiMassage" INTEGER`
  );

  // Drop generic priceTable column (replaced by priceTableSmall/Medium/Large)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Venue" DROP COLUMN IF EXISTS "priceTable"`
  );

  // Remove erroneously created massage subcategories (if they exist)
  for (const slug of ["thai-massage", "oil-massage", "foot-massage"]) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Category" WHERE slug = '${slug}'`
    ).catch(() => {});
  }

  console.log("✓ Migrations applied!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
