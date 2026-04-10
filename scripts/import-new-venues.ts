/**
 * Import approved venues from data/new_spots_to_add.json into PostgreSQL via Prisma.
 *
 * Usage:
 *   npx tsx scripts/import-new-venues.ts          # DRY_RUN (default)
 *   DRY_RUN=false npx tsx scripts/import-new-venues.ts  # actual import
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== 'false';

interface SpotData {
  name: string;
  slug: string;
  category: string; // category slug
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceUrl: string;
  isActive: boolean;
  isVerified: boolean;
}

interface ImportFile {
  summary: { totalApproved: number };
  spots: SpotData[];
}

async function main() {
  const filePath = path.join(__dirname, '..', 'data', 'new_spots_to_add.json');
  const data: ImportFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`\n📦 Import ${data.spots.length} venues (DRY_RUN=${DRY_RUN})\n`);

  // 1. Ensure "coffee-shop" category exists
  await prisma.category.upsert({
    where: { slug: 'coffee-shop' },
    update: {},
    create: {
      name: 'Coffee Shop',
      slug: 'coffee-shop',
      color: '#22C55E',
      sortOrder: 15,
    },
  });

  // 2. Load all categories by slug → id
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map(c => [c.slug, c.id]));
  console.log(`📂 ${categories.length} categories loaded`);

  // 2. Check for existing slugs to avoid conflicts
  const existingSlugs = new Set(
    (await prisma.venue.findMany({ select: { slug: true } })).map(v => v.slug)
  );
  console.log(`🏪 ${existingSlugs.size} existing venue slugs loaded\n`);

  let created = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const spot of data.spots) {
    // Resolve category
    const categoryId = catMap.get(spot.category);
    if (!categoryId) {
      errors.push(`❌ No category found for slug "${spot.category}" — skipping "${spot.name}"`);
      skipped++;
      continue;
    }

    // Check slug uniqueness
    let slug = spot.slug;
    if (existingSlugs.has(slug)) {
      // Append suffix
      let i = 2;
      while (existingSlugs.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
      console.log(`  ⚠️  Slug conflict: "${spot.slug}" → "${slug}"`);
    }

    // Map neighborhood → district
    const district = spot.neighborhood || null;

    if (DRY_RUN) {
      console.log(`  [DRY] Would create: ${spot.name} (${spot.category}) → /${slug}`);
      created++;
      existingSlugs.add(slug);
    } else {
      try {
        await prisma.venue.create({
          data: {
            name: spot.name,
            slug,
            address: spot.address,
            district,
            phone: spot.phone,
            website: spot.website,
            facebook: spot.facebook,
            instagram: spot.instagram,
            lat: spot.lat,
            lng: spot.lng,
            isActive: true,
            isVerified: false,
            categoryId,
          },
        });
        existingSlugs.add(slug);
        created++;
        console.log(`  ✅ ${spot.name} (${spot.category})`);
      } catch (err: any) {
        errors.push(`❌ Failed "${spot.name}": ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  if (errors.length) {
    console.log(`\n⚠️  Errors:`);
    errors.forEach(e => console.log(`  ${e}`));
  }

  // Final count
  if (!DRY_RUN) {
    const total = await prisma.venue.count();
    console.log(`\n🏪 Total venues in DB: ${total}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
