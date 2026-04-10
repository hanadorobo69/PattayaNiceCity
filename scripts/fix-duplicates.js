// fix-duplicates.js — Remove duplicate venues, merging data into the keeper
// Usage: node scripts/fix-duplicates.js
// Run from ~/PattayaViceCity on the server

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Duplicate pairs: [nameA, nameB] — we'll find both and decide which to keep
const DUPLICATE_PAIRS = [
  // BJ Bar
  ["Bada Bing", "Bada Bing Club"],
  ["Club 4", "Club 4 BJ Bar"],
  // GoGo
  ["XS A Gogo", "XS A Go Go"],
  ["Queen Club", "Queen Club LK Metro"],
  ["Windmill Club", "Windmill Club Agogo Bar Pattaya"],
  ["PH 3.9 Agogo", "PH 3.9 A Go Go"],
  ["Glass House Agogo", "Glass House A Go Go"],
  // Nightclub
  ["Lucifer", "Lucifer Music Cafe (Bar)"],
  ["World House", "World House Pattaya"],
  // Gay Bar
  ["@Home bar", "@Home Bar Jomtien"],
  ["Panorama Pub", "Panorama Pub Boyztown"],
  // Ladyboy Bar
  ["Cherry Bar", "Cherry Bar Pattaya"],
  ["Sensations Bar", "Sensations Ladyboy Bar"],
  ["Emmy's Bar", "Emmy's Ladyboy Bar"],
  ["Cocka2 Bar", "Cocka2 Ladyboy Bar"],
  // Girl Bar
  ["Triangle Bar", "The Triangle Bar"],
  // Massage
  ["HONEY 1 BODY MASSAGE", "Honey 1 Body Massage (Ladyboy Staff)"],
  ["Honey 3 Body Massage", "Grand Honey 3 Body Massage"],
];

// Same-name duplicates: check if 2+ venues share this exact name
const SAME_NAME_DUPES = [
  "Dick Inn Beer Bar",
  "Jomtien Complex Walking Street",
  "CLUB 555",
  "Carre Blanc",
];

// Fields that can be merged from loser to keeper
const MERGEABLE_FIELDS = [
  "description", "address", "district", "phone", "phoneType",
  "whatsapp", "lineId", "lineQrUrl", "website", "facebook", "instagram",
  "hours", "lat", "lng", "imageUrl", "priceRange",
  "priceSoftDrink", "priceBeerMin", "priceBeerMax", "priceAlcoholMin", "priceAlcoholMax",
  "priceLadyDrink", "priceBottleMin", "priceBottleMax",
  "priceBarfineMin", "priceBarfineMax", "priceShortTimeMin", "priceShortTimeMax",
  "priceLongTimeMin", "priceLongTimeMax",
  "priceRoomSmall", "priceRoomLarge", "priceBJ", "priceBoomBoom",
  "priceTableSmall", "priceTableMedium", "priceTableLarge",
  "priceThaiMassage", "priceFootMassage", "priceOilMassage",
  "priceCoffeeMin", "priceCoffeeMax", "priceFoodMin", "priceFoodMax",
  "hotelStars", "bestHours", "typicalBudgetMin", "typicalBudgetMax",
  "crowdStyle", "safetyNote", "nearbyHotels",
];

function countNonNullFields(venue) {
  let count = 0;
  for (const key of Object.keys(venue)) {
    if (venue[key] !== null && venue[key] !== undefined && venue[key] !== "" && venue[key] !== false && venue[key] !== 0) {
      count++;
    }
  }
  return count;
}

async function getVenueWithCounts(venue) {
  const [ratingsCount, commentsCount] = await Promise.all([
    prisma.venueRating.count({ where: { venueId: venue.id } }),
    prisma.venueComment.count({ where: { venueId: venue.id } }),
  ]);
  return { ...venue, _ratingsCount: ratingsCount, _commentsCount: commentsCount };
}

async function decideKeeperAndLoser(venueA, venueB) {
  const a = await getVenueWithCounts(venueA);
  const b = await getVenueWithCounts(venueB);

  // Rule: if one has ratings/comments, always keep that one
  const aHasEngagement = a._ratingsCount > 0 || a._commentsCount > 0;
  const bHasEngagement = b._ratingsCount > 0 || b._commentsCount > 0;

  if (aHasEngagement && !bHasEngagement) return { keeper: a, loser: b };
  if (bHasEngagement && !aHasEngagement) return { keeper: b, loser: a };

  // Both have engagement — ABORT, do not delete either
  if (aHasEngagement && bHasEngagement) return null;

  // Neither has engagement — keep the one with more data
  const aNonNull = countNonNullFields(a);
  const bNonNull = countNonNullFields(b);

  if (aNonNull >= bNonNull) return { keeper: a, loser: b };
  return { keeper: b, loser: a };
}

async function mergeAndDelete(keeper, loser) {
  const log = [];
  log.push(`  KEEPER: "${keeper.name}" (id: ${keeper.id}, ratings: ${keeper._ratingsCount}, comments: ${keeper._commentsCount})`);
  log.push(`  LOSER:  "${loser.name}" (id: ${loser.id}, ratings: ${loser._ratingsCount}, comments: ${loser._commentsCount})`);

  // SAFETY: Never delete a venue that has ratings or comments
  if (loser._ratingsCount > 0 || loser._commentsCount > 0) {
    log.push(`  *** ABORT: Loser has ${loser._ratingsCount} ratings and ${loser._commentsCount} comments — NOT deleting`);
    return log;
  }

  // Merge data from loser to keeper
  const updateData = {};
  const mergedFields = [];
  for (const field of MERGEABLE_FIELDS) {
    const keeperVal = keeper[field];
    const loserVal = loser[field];
    // If keeper is missing this field but loser has it, copy it
    if ((keeperVal === null || keeperVal === undefined || keeperVal === "") &&
        loserVal !== null && loserVal !== undefined && loserVal !== "") {
      updateData[field] = loserVal;
      mergedFields.push(`${field}: "${loserVal}"`);
    }
  }

  if (mergedFields.length > 0) {
    await prisma.venue.update({ where: { id: keeper.id }, data: updateData });
    log.push(`  MERGED ${mergedFields.length} fields to keeper: ${mergedFields.join(", ")}`);
  } else {
    log.push(`  No fields to merge (keeper already has all data)`);
  }

  // Before deleting, reassign related records that won't cascade:
  // Posts: set venueId to null (FK has no cascade)
  const postsUpdated = await prisma.post.updateMany({
    where: { venueId: loser.id },
    data: { venueId: null },
  });
  if (postsUpdated.count > 0) {
    log.push(`  Detached ${postsUpdated.count} posts from loser venue`);
  }

  // Girls: move to keeper instead of orphaning
  const girlsUpdated = await prisma.girl.updateMany({
    where: { venueId: loser.id },
    data: { venueId: keeper.id },
  });
  if (girlsUpdated.count > 0) {
    log.push(`  Moved ${girlsUpdated.count} girls to keeper venue`);
  }

  // Events: move to keeper instead of orphaning
  const eventsUpdated = await prisma.event.updateMany({
    where: { venueId: loser.id },
    data: { venueId: keeper.id },
  });
  if (eventsUpdated.count > 0) {
    log.push(`  Moved ${eventsUpdated.count} events to keeper venue`);
  }

  // The rest (VenueMedia, VenueMenuMedia, VenueView, VenueFavorite, VenueRating, VenueComment)
  // will cascade-delete automatically. Log counts for audit trail.
  const [mediaCount, menuMediaCount, viewsCount, favCount] = await Promise.all([
    prisma.venueMedia.count({ where: { venueId: loser.id } }),
    prisma.venueMenuMedia.count({ where: { venueId: loser.id } }),
    prisma.venueView.count({ where: { venueId: loser.id } }),
    prisma.venueFavorite.count({ where: { venueId: loser.id } }),
  ]);

  if (mediaCount > 0) log.push(`  Will cascade-delete ${mediaCount} media`);
  if (menuMediaCount > 0) log.push(`  Will cascade-delete ${menuMediaCount} menu media`);
  if (viewsCount > 0) log.push(`  Will cascade-delete ${viewsCount} views`);
  if (favCount > 0) log.push(`  Will cascade-delete ${favCount} favorites`);

  // Also handle Translations referencing this venue
  const transDeleted = await prisma.translation.deleteMany({
    where: { entityType: "venue", entityId: loser.id },
  });
  if (transDeleted.count > 0) {
    log.push(`  Deleted ${transDeleted.count} translations for loser venue`);
  }

  // Now delete the venue (cascading related records)
  await prisma.venue.delete({ where: { id: loser.id } });
  log.push(`  DELETED venue "${loser.name}" (id: ${loser.id})`);

  return log;
}

async function findVenueByName(name) {
  return prisma.venue.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });
}

async function processPair(nameA, nameB) {
  const logs = [`\n--- Pair: "${nameA}" / "${nameB}" ---`];

  const venueA = await findVenueByName(nameA);
  const venueB = await findVenueByName(nameB);

  if (!venueA && !venueB) {
    logs.push(`  SKIP: Neither venue found in database`);
    return logs;
  }
  if (!venueA) {
    logs.push(`  SKIP: "${nameA}" not found (only "${nameB}" exists, id: ${venueB.id})`);
    return logs;
  }
  if (!venueB) {
    logs.push(`  SKIP: "${nameB}" not found (only "${nameA}" exists, id: ${venueA.id})`);
    return logs;
  }
  if (venueA.id === venueB.id) {
    logs.push(`  SKIP: Both names resolve to the same venue (id: ${venueA.id})`);
    return logs;
  }

  const decision = await decideKeeperAndLoser(venueA, venueB);
  if (!decision) {
    logs.push(`  ABORT: Both venues have ratings/comments — manual review needed`);
    return logs;
  }

  const actionLogs = await mergeAndDelete(decision.keeper, decision.loser);
  logs.push(...actionLogs);
  return logs;
}

async function processSameNameDuplicates(name) {
  const logs = [`\n--- Same-name check: "${name}" ---`];

  const venues = await prisma.venue.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (venues.length < 2) {
    logs.push(`  SKIP: Only ${venues.length} venue(s) found with this name`);
    return logs;
  }

  logs.push(`  Found ${venues.length} venues with name "${name}"`);

  // Process pairwise: keep the best one, delete the rest
  const withCounts = await Promise.all(venues.map(getVenueWithCounts));

  // Sort: venues with engagement first, then by non-null field count
  withCounts.sort((a, b) => {
    const aEng = a._ratingsCount + a._commentsCount;
    const bEng = b._ratingsCount + b._commentsCount;
    if (aEng !== bEng) return bEng - aEng;
    return countNonNullFields(b) - countNonNullFields(a);
  });

  const keeper = withCounts[0];
  const losers = withCounts.slice(1);

  for (const loser of losers) {
    const actionLogs = await mergeAndDelete(keeper, loser);
    logs.push(...actionLogs);
  }

  return logs;
}

async function main() {
  console.log("=== DUPLICATE VENUE CLEANUP ===");
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const allLogs = [];

  // Process named pairs
  for (const [nameA, nameB] of DUPLICATE_PAIRS) {
    const logs = await processPair(nameA, nameB);
    allLogs.push(...logs);
    logs.forEach((l) => console.log(l));
  }

  // Process same-name duplicates
  for (const name of SAME_NAME_DUPES) {
    const logs = await processSameNameDuplicates(name);
    allLogs.push(...logs);
    logs.forEach((l) => console.log(l));
  }

  console.log("\n=== DONE ===");
  console.log(`Finished at: ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
