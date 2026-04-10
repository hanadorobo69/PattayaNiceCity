import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const cats = await p.category.findMany({ select: { id: true, slug: true, name: true, sortOrder: true }, orderBy: { sortOrder: "asc" } });
  console.log("=== CATEGORIES ===");
  for (const c of cats) console.log(c.id + " | " + c.slug + " | " + c.name + " | sort:" + c.sortOrder);
  
  console.log("\n=== VENUE COUNT PER CATEGORY ===");
  const counts = await p.venue.groupBy({ by: ["categoryId"], _count: true, orderBy: { _count: { categoryId: "desc" } } });
  const catMap = Object.fromEntries(cats.map(c => [c.id, c.slug]));
  for (const c of counts) console.log((catMap[c.categoryId] || c.categoryId) + ": " + c._count);

  const rated = await p.venueRating.findMany({ select: { venueId: true }, distinct: ["venueId"] });
  console.log("\nTotal venues with ratings: " + rated.length);
  const ratedIds = new Set(rated.map(r => r.venueId));
  
  const relevant = ["gogo-bar", "bj-bar", "girl-bar", "gentlemen-club", "ladyboy-bar", "ladyboy-gogo"];
  for (const slug of relevant) {
    const cat = cats.find(c => c.slug === slug);
    if (!cat) { console.log(slug + ": CATEGORY NOT FOUND"); continue; }
    const venues = await p.venue.findMany({ where: { categoryId: cat.id }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
    const ratedVenues = venues.filter(v => ratedIds.has(v.id));
    console.log("\n" + slug + " (" + venues.length + " total, " + ratedVenues.length + " rated):");
    for (const v of venues) console.log("  " + (ratedIds.has(v.id) ? "[RATED] " : "") + v.name + " (" + v.slug + ")");
  }
  
  await p.$disconnect();
}
main();
