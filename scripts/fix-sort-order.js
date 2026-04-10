const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Reorder: Bar=10, GoGo=11, Gent Club=12, Club=13, Massage=14
  await prisma.category.update({ where: { slug: "ladyboy-bar" }, data: { sortOrder: 10 } });
  await prisma.category.update({ where: { slug: "ladyboy-gogo" }, data: { sortOrder: 11 } });
  await prisma.category.update({ where: { slug: "ladyboy-gentlemens-club" }, data: { sortOrder: 12 } });
  await prisma.category.update({ where: { slug: "ladyboy-club" }, data: { sortOrder: 13 } });
  await prisma.category.update({ where: { slug: "ladyboy-massage" }, data: { sortOrder: 14 } });

  // Verify
  const cats = await prisma.category.findMany({
    where: { slug: { startsWith: "ladyboy-" } },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true, sortOrder: true }
  });
  console.log("Ladyboy categories order:");
  for (const c of cats) console.log(`  ${c.sortOrder}: ${c.name}`);
}

main().then(() => prisma.$disconnect());
