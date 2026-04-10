const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Fix Gentleman's -> Gentlemen's
  const updated = await prisma.category.updateMany({
    where: { slug: "gentlemans-club" },
    data: { name: "Gentlemen's Club" }
  });
  console.log("Fixed gentlemans-club name:", updated.count);

  // Create Ladyboy Gentlemen's Club category
  const created = await prisma.category.upsert({
    where: { slug: "ladyboy-gentlemens-club" },
    update: { name: "Ladyboy Gentlemen's Club" },
    create: {
      name: "Ladyboy Gentlemen's Club",
      slug: "ladyboy-gentlemens-club",
      description: "Ladyboy gentlemen's clubs",
      color: "#B45CF6",
      icon: "\u2728",
      sortOrder: 14
    }
  });
  console.log("Created/updated ladyboy-gentlemens-club:", created.id);

  // Verify
  const cats = await prisma.category.findMany({
    where: { slug: { in: ["gentlemans-club", "ladyboy-gentlemens-club"] } },
    select: { name: true, slug: true, sortOrder: true }
  });
  console.log("Result:", cats);
}

main().then(() => prisma.$disconnect());
