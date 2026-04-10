/**
 * Reclassify "bar" venues into "bar" (normal) and "girly-bar" (hostess/beer bars with girls).
 *
 * Usage:
 *   npx tsx scripts/reclassify-bars.ts          # DRY_RUN (default)
 *   DRY_RUN=false npx tsx scripts/reclassify-bars.ts  # actual migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== 'false';

// ─── Girly bar slugs — these get moved from "bar" → "girly-bar" ───
const GIRLY_BAR_SLUGS = new Set([
  // ── Soi 6 bars (all are girly bars) ──
  "click-bar-lick-bar",
  "corner-bar-soi-6",
  "foxy-bar-soi-6",
  "gold-bar-pattaya-soi6",
  "good-fellas-bar",
  "green-bike-bar",
  "la-la-land",
  "liquid-soi-6",
  "love-missile-soi-6",
  "lust-on-soi-6",
  "miso-bar-pattaya-soi-6",
  "my-friend-you-bar",
  "panda-bar-soi6",
  "promises-bar-soi-6-pattaya",
  "red-point",
  "route-69",
  "showgirls-soi-6",
  "slutz-on-soi-6",
  "sweet-bar-pattaya-soi-6",
  "the-spot-soi-6",
  // ── Tree Town / Soi Buakhao beer bars ──
  "bamboo-bar-pattayatai",
  "candy-bar-tree-town",
  "lucky-7-bar",
  "las-vegas-beer-garden",
  "naughty-bar-soi-7",
  "princess-bar",
  "the-triangle-bar",
  "triangle-bar",
  // ── Walking Street beer bars ──
  "candy-shop-walking-street",
  "hot-tuna-bar",
  // ── Other known girly bars ──
  "the-bando-bar-pattaya",
]);

// Everything else in "bar" stays as "bar" (pubs, rooftops, breweries, lounges, live music)

async function main() {
  console.log(`\n🔄 Reclassify bars → bar + girly-bar (DRY_RUN=${DRY_RUN})\n`);

  // 1. Create or get "girly-bar" category
  const girlyBarCat = await prisma.category.upsert({
    where: { slug: 'girly-bar' },
    update: {},
    create: {
      name: 'Girly Bar',
      slug: 'girly-bar',
      color: '#FF69B4',
      icon: '💃',
      sortOrder: 3,
    },
  });
  console.log(`📂 girly-bar category: ${girlyBarCat.id}`);

  // 2. Get current "bar" category
  const barCat = await prisma.category.findUnique({ where: { slug: 'bar' } });
  if (!barCat) { console.log('❌ No "bar" category found'); return; }

  // 3. Get all "bar" venues
  const barVenues = await prisma.venue.findMany({
    where: { categoryId: barCat.id },
    select: { id: true, name: true, slug: true, district: true },
    orderBy: { name: 'asc' },
  });
  console.log(`🏪 ${barVenues.length} venues currently in "bar"\n`);

  const toMove = barVenues.filter(v => GIRLY_BAR_SLUGS.has(v.slug));
  const toStay = barVenues.filter(v => !GIRLY_BAR_SLUGS.has(v.slug));

  console.log(`💃 ${toMove.length} → girly-bar:`);
  for (const v of toMove) {
    console.log(`   ${DRY_RUN ? '[DRY] ' : ''}${v.name} (${v.district})`);
  }

  console.log(`\n🍺 ${toStay.length} → stay as bar:`);
  for (const v of toStay) {
    console.log(`   ${v.name} (${v.district})`);
  }

  // 4. Execute reclassification
  if (!DRY_RUN) {
    const result = await prisma.venue.updateMany({
      where: { slug: { in: toMove.map(v => v.slug) } },
      data: { categoryId: girlyBarCat.id },
    });
    console.log(`\n✅ Moved ${result.count} venues to girly-bar`);
  } else {
    console.log(`\n[DRY_RUN] Would move ${toMove.length} venues`);
  }

  // 5. Verify
  if (!DRY_RUN) {
    const barCount = await prisma.venue.count({ where: { categoryId: barCat.id } });
    const girlyCount = await prisma.venue.count({ where: { categoryId: girlyBarCat.id } });
    console.log(`\n📊 Final counts:`);
    console.log(`   bar: ${barCount}`);
    console.log(`   girly-bar: ${girlyCount}`);
  }

  // Check for slugs in our list that weren't found
  const foundSlugs = new Set(toMove.map(v => v.slug));
  const missing = [...GIRLY_BAR_SLUGS].filter(s => !foundSlugs.has(s));
  if (missing.length > 0) {
    console.log(`\n⚠️  ${missing.length} slugs in GIRLY_BAR_SLUGS not found in bar category:`);
    missing.forEach(s => console.log(`   - ${s}`));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
