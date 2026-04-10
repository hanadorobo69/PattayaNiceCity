import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const barCat = await prisma.category.findUnique({ where: { slug: 'bar' } });
  if (!barCat) { console.log('No bar category'); return; }

  const bars = await prisma.venue.findMany({
    where: { categoryId: barCat.id },
    select: { id: true, name: true, slug: true, address: true, district: true },
    orderBy: { name: 'asc' }
  });

  console.log(JSON.stringify(bars, null, 2));
  console.log('\nTOTAL:', bars.length);
  await prisma.$disconnect();
}
main();
