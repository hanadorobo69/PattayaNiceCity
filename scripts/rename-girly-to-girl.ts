import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.category.update({ where: { slug: 'girly-bar' }, data: { name: 'Girl Bar' } });
  console.log('✅', r.slug, '→', r.name);
  await prisma.$disconnect();
}
main();
