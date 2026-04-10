import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ORDER: Record<string, number> = {
  'bar':               1,
  'girly-bar':         2,
  'gogo-bar':          3,
  'russian-gogo':      4,
  'club':              5,
  'gentlemans-club':   6,
  'ktv':               7,
  'bj-bar':            8,
  'massage':           9,
  'freelance':        10,
  'short-time-hotel': 11,
  'coffee-shop':      12,
  'ladyboy-bar':      15,
  'ladyboy-gogo':     16,
  'ladyboy-club':     17,
  'ladyboy-massage':  18,
  'ladyboy-freelance':19,
  'gay-bar':          20,
  'gay-gogo':         21,
  'gay-club':         22,
  'gay-massage':      23,
  'gay-freelance':    24,
  'general':          30,
  'events':           31,
  'location-bike-car':32,
  'administration':   33,
};

async function main() {
  for (const [slug, sortOrder] of Object.entries(ORDER)) {
    await prisma.category.update({ where: { slug }, data: { sortOrder } });
  }
  const cats = await prisma.category.findMany({ select: { slug: true, name: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } });
  cats.forEach(c => console.log(String(c.sortOrder).padStart(3), c.slug.padEnd(22), c.name));
  await prisma.$disconnect();
}
main();
