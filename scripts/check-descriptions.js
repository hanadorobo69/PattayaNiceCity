const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.venue.findMany({
    select: { id: true, name: true, description: true, _count: { select: { venueRatings: true } } }
  });
  const withDesc = all.filter(v => v.description && v.description.trim().length > 0);
  console.log("Total venues:", all.length);
  console.log("With description:", withDesc.length);
  const noRating = withDesc.filter(v => v._count.venueRatings === 0);
  const hasRating = withDesc.filter(v => v._count.venueRatings > 0);
  console.log("With desc + NO ratings (to clear):", noRating.length);
  console.log("With desc + ratings (keep):", hasRating.length);
  for (const v of noRating) {
    console.log("  CLEAR:", v.name, "|", (v.description ? v.description.substring(0, 60) : ""));
  }
  for (const v of hasRating) {
    console.log("  KEEP:", v.name, "| ratings:", v._count.venueRatings);
  }
}

main().then(() => prisma.$disconnect());
