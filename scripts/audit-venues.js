const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // ═══════════════════════════════════════════════════════════════
  // 1. ALL CATEGORIES WITH VENUE COUNT
  // ═══════════════════════════════════════════════════════════════
  console.log("═".repeat(80));
  console.log("1. ALL CATEGORIES WITH VENUE COUNT (ordered by count desc)");
  console.log("═".repeat(80));

  const categories = await prisma.category.findMany({
    include: { _count: { select: { venues: true } } },
    orderBy: { venues: { _count: "desc" } },
  });

  for (const c of categories) {
    console.log(
      `  [${c.slug}] ${c.name} — ${c._count.venues} venues (sortOrder=${c.sortOrder}, adminOnly=${c.isAdminOnly})`
    );
  }
  console.log(`\n  TOTAL categories: ${categories.length}`);
  const totalVenues = categories.reduce((s, c) => s + c._count.venues, 0);
  console.log(`  TOTAL venues: ${totalVenues}`);

  // ═══════════════════════════════════════════════════════════════
  // 2. CORE CATEGORY VENUES (nightlife / bar categories)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(80));
  console.log("2. VENUES IN CORE NIGHTLIFE CATEGORIES");
  console.log("═".repeat(80));

  const coreSlugs = [
    "gentlemen-club", "gentlemens-club", "gentlemen-clubs",
    "bj-bar", "bj-bars",
    "gogo", "gogo-bar", "gogo-bars", "go-go",
    "girl-bar", "girl-bars", "beer-bar", "beer-bars",
    "ladyboy-bar", "ladyboy-bars",
    "ladyboy-gogo", "ladyboy-gogos",
    "gay-bar", "gay-bars",
    "night-club", "night-clubs", "nightclub", "nightclubs", "club",
  ];

  let coreCategories = await prisma.category.findMany({
    where: { slug: { in: coreSlugs } },
  });

  if (coreCategories.length === 0) {
    // Try partial match
    const allCats = await prisma.category.findMany();
    const keywords = ["gogo", "girl", "bar", "club", "ladyboy", "gay", "bj", "gentlem", "night"];
    const matched = allCats.filter((c) =>
      keywords.some((k) => c.slug.includes(k) || c.name.toLowerCase().includes(k))
    );
    console.log("  No exact slug match. Fuzzy-matched categories:");
    for (const m of matched) {
      console.log(`    -> ${m.slug} (${m.name})`);
    }
    coreCategories = matched;
  }

  const coreCatIds = coreCategories.map((c) => c.id);
  console.log(
    `\n  Matched ${coreCategories.length} core categories: ${coreCategories.map((c) => c.slug).join(", ")}`
  );

  const venues = await prisma.venue.findMany({
    where: { categoryId: { in: coreCatIds } },
    include: {
      category: true,
      _count: { select: { venueRatings: true, venueComments: true } },
    },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  let currentCat = "";
  for (const v of venues) {
    if (v.category.slug !== currentCat) {
      currentCat = v.category.slug;
      console.log(`\n  ── ${v.category.name} [${v.category.slug}] ──`);
    }
    const desc50 = v.description ? v.description.substring(0, 50).replace(/\n/g, " ") : "(none)";
    const hasRatings = v._count.venueRatings > 0;
    const hasComments = v._count.venueComments > 0;
    const flags = [];
    if (!v.isActive) flags.push("INACTIVE");
    if (v.permanentlyClosed) flags.push("CLOSED");
    if (hasRatings) flags.push(`${v._count.venueRatings} ratings`);
    if (hasComments) flags.push(`${v._count.venueComments} comments`);
    if (!v.address) flags.push("NO_ADDR");
    if (!v.lat || !v.lng) flags.push("NO_GPS");
    if (!v.hours) flags.push("NO_HOURS");
    if (!v.imageUrl) flags.push("NO_IMG");

    console.log(
      `    ${v.name} (${v.slug})` +
        (flags.length ? ` [${flags.join(", ")}]` : "")
    );
    console.log(
      `      id=${v.id}  active=${v.isActive}` +
        `  addr="${v.address || ""}"  hours="${v.hours || ""}"` +
        `  lat=${v.lat ?? "null"} lng=${v.lng ?? "null"}`
    );
    console.log(
      `      img=${v.imageUrl ? "YES" : "NO"}  desc="${desc50}"` +
        `  phone=${v.phone || "-"}  fb=${v.facebook || "-"}  ig=${v.instagram || "-"}  web=${v.website || "-"}`
    );
  }
  console.log(`\n  TOTAL venues in core categories: ${venues.length}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. POTENTIAL DUPLICATES (similar names within same category)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(80));
  console.log("3. POTENTIAL DUPLICATES (similar names within same category)");
  console.log("═".repeat(80));

  const allVenues = await prisma.venue.findMany({
    include: { category: true },
    orderBy: { categoryId: "asc" },
  });

  // Group by category
  const byCat = {};
  for (const v of allVenues) {
    if (!byCat[v.categoryId]) byCat[v.categoryId] = [];
    byCat[v.categoryId].push(v);
  }

  function normalize(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/^the/, "");
  }

  function isSimilar(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    if (na === nb) return true;
    if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return true;
    // Levenshtein for short names
    if (na.length <= 8 && nb.length <= 8) {
      const dist = levenshtein(na, nb);
      if (dist <= 1) return true;
    }
    return false;
  }

  function levenshtein(a, b) {
    const m = a.length,
      n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
        );
    return dp[m][n];
  }

  let dupCount = 0;
  for (const [catId, venueList] of Object.entries(byCat)) {
    const catName = venueList[0].category.name;
    const found = [];
    for (let i = 0; i < venueList.length; i++) {
      for (let j = i + 1; j < venueList.length; j++) {
        if (isSimilar(venueList[i].name, venueList[j].name)) {
          found.push([venueList[i], venueList[j]]);
        }
      }
    }
    if (found.length > 0) {
      console.log(`\n  ── ${catName} ──`);
      for (const [a, b] of found) {
        dupCount++;
        console.log(
          `    DUPE? "${a.name}" (${a.slug}, active=${a.isActive}) <-> "${b.name}" (${b.slug}, active=${b.isActive})`
        );
      }
    }
  }
  if (dupCount === 0) {
    console.log("  No potential duplicates found.");
  } else {
    console.log(`\n  Total potential duplicate pairs: ${dupCount}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. PROTECTED VENUES (have ratings or comments)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(80));
  console.log("4. PROTECTED VENUES (have ratings or comments — cannot delete)");
  console.log("═".repeat(80));

  const protectedVenues = await prisma.venue.findMany({
    where: {
      OR: [
        { venueRatings: { some: {} } },
        { venueComments: { some: {} } },
      ],
    },
    include: {
      category: true,
      _count: { select: { venueRatings: true, venueComments: true } },
    },
    orderBy: { name: "asc" },
  });

  for (const v of protectedVenues) {
    console.log(
      `  ${v.name} [${v.category.slug}] — ${v._count.venueRatings} ratings, ${v._count.venueComments} comments`
    );
  }
  console.log(`\n  TOTAL protected venues: ${protectedVenues.length}`);
  console.log(`  TOTAL venues in database: ${allVenues.length}`);
  console.log(
    `  Deletable (no ratings/comments): ${allVenues.length - protectedVenues.length}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
