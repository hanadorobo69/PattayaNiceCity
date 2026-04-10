/**
 * Export all venues from PostgreSQL to a single JSON file.
 * Also validates data integrity and prints a category breakdown.
 *
 * Usage: npx tsx scripts/export-all-venues.ts
 * Output: venues.json at project root
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // 1. Fetch all venues with category
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      district: true,
      city: true,
      phone: true,
      website: true,
      facebook: true,
      instagram: true,
      hours: true,
      lat: true,
      lng: true,
      isActive: true,
      isVerified: true,
      permanentlyClosed: true,
      priceRange: true,
      category: { select: { slug: true, name: true } },
    },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { name: 'asc' },
    ],
  });

  console.log(`\n📊 Total venues: ${venues.length}\n`);

  // 2. Category breakdown
  const catCounts = new Map<string, number>();
  for (const v of venues) {
    const cat = v.category.slug;
    catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
  }

  console.log('Category breakdown:');
  const sortedCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  // 3. Data quality checks
  const issues: string[] = [];
  const slugSet = new Set<string>();
  for (const v of venues) {
    // Duplicate slug check
    if (slugSet.has(v.slug)) {
      issues.push(`⚠️  Duplicate slug: ${v.slug}`);
    }
    slugSet.add(v.slug);

    // Empty name check
    if (!v.name || v.name.trim() === '') {
      issues.push(`⚠️  Empty name: ${v.slug}`);
    }
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  ${issues.length} data issues:`);
    issues.forEach(i => console.log(`  ${i}`));
  } else {
    console.log('\n✅ Data integrity: all clean');
  }

  // 4. Write output
  const output = {
    exportedAt: new Date().toISOString(),
    totalVenues: venues.length,
    byCategory: Object.fromEntries(sortedCats),
    venues: venues.map(v => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      category: v.category.slug,
      categoryName: v.category.name,
      address: v.address,
      district: v.district,
      city: v.city,
      phone: v.phone,
      website: v.website,
      facebook: v.facebook,
      instagram: v.instagram,
      hours: v.hours,
      lat: v.lat,
      lng: v.lng,
      isActive: v.isActive,
      isVerified: v.isVerified,
      permanentlyClosed: v.permanentlyClosed,
      priceRange: v.priceRange,
    })),
  };

  const outPath = path.join(__dirname, '..', 'venues.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Exported to ${outPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
