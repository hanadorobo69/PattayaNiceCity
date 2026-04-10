import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  for (const slug of ["girly-bar", "gentlemans-club"]) {
    const cat = await p.category.findFirst({ where: { slug } });
    if (!cat) { console.log(slug + ": NOT FOUND"); continue; }
    const venues = await p.venue.findMany({ where: { categoryId: cat.id }, select: { name: true, slug: true }, orderBy: { name: "asc" } });
    console.log("\n" + slug + " (" + venues.length + "):");
    for (const v of venues) console.log("  " + v.name + " (" + v.slug + ")");
  }
  // Also get ALL venue names to check duplicates globally
  const all = await p.venue.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } });
  console.log("\n=== ALL VENUE SLUGS (" + all.length + ") ===");
  for (const v of all) console.log(v.slug);
  await p.$disconnect();
}
main();
