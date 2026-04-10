const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Clear descriptions for venues that have NO ratings
  const result = await prisma.venue.updateMany({
    where: {
      description: { not: null },
      venueRatings: { none: {} }
    },
    data: { description: null }
  });

  console.log("Cleared descriptions for", result.count, "venues without ratings");

  // Verify
  const remaining = await prisma.venue.count({
    where: { description: { not: null } }
  });
  console.log("Venues still with descriptions:", remaining);
}

main().then(() => prisma.$disconnect());
