import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ select: { slug: true, name: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } });
  cats.forEach(c => console.log(String(c.sortOrder).padStart(3), c.slug.padEnd(22), c.name));
  await prisma.$disconnect();
}
main();
