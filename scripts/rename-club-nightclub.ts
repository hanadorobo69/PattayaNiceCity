/**
 * Rename "Club" → "Nightclub" for club, ladyboy-club, gay-club categories.
 * Slugs stay the same (URLs unchanged), only display names change.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RENAMES: Record<string, string> = {
  'club': 'Nightclub',
  'ladyboy-club': 'Ladyboy Nightclub',
  'gay-club': 'Gay Nightclub',
};

async function main() {
  for (const [slug, newName] of Object.entries(RENAMES)) {
    const result = await prisma.category.update({
      where: { slug },
      data: { name: newName },
    });
    console.log(`✅ ${slug}: "${result.name}"`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
