/**
 * Comprehensive venue data update script for core nightlife categories.
 *
 * Usage:
 *   DRY RUN:  node scripts/update-venues.js          (default — logs only)
 *   APPLY:    node scripts/update-venues.js --apply   (writes to DB)
 *
 * Run on VPS:  cd ~/PattayaViceCity && node scripts/update-venues.js
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DRY_RUN = !process.argv.includes("--apply");

// ─── PROTECTED venues (have ratings/comments) — NEVER modify or delete ───────
const PROTECTED_SLUGS = [
  "007-club",
  "juicy-lucy",
  "kink",
  "la-poste-bar",
  "peachy-lily",
  "purple-club",
  "telephone-bar",
];

// ─── Helper: generate slug from name ─────────────────────────────────────────
function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Stats ───────────────────────────────────────────────────────────────────
let statsUpdated = 0;
let statsAdded = 0;
let statsDeleted = 0;
let statsSkippedProtected = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. UPDATES: data corrections for existing venues
// ═══════════════════════════════════════════════════════════════════════════════
// Format: { slug, data-to-set }
// Only non-null fields will be updated. We never overwrite existing data with null.
const VENUE_UPDATES = [
  // ── GoGo Bars ──────────────────────────────────────────────────────────────
  {
    slug: "sapphire-club",
    data: {
      description: "One of the biggest and most popular GoGo bars on Walking Street. Multi-level venue with large stages, dozens of dancers, and a premium party atmosphere. A Pattaya institution.",
      address: "175/40-41 Moo 10, Walking Street, Pattaya",
    },
  },
  {
    slug: "baccara-a-go-go",
    data: {
      description: "Long-established GoGo bar on Walking Street known for its large number of attractive dancers and lively shows. One of the classic Pattaya venues.",
      address: "Walking Street, Pattaya",
    },
  },
  {
    slug: "windmill-club",
    data: {
      description: "Hardcore GoGo bar on Soi Diamond (off Walking Street). Sister bar of Sugar Baby. Known for its anything-goes atmosphere and intimate interaction with dancers.",
      address: "29/79 Soi Diamond, Walking Street, Pattaya",
    },
  },
  {
    slug: "xs-a-go-go",
    data: {
      description: "Arguably the top GoGo bar in Pattaya as of 2025-2026. Huge, fully renovated venue on Walking Street with the highest number of beautiful dancers and excellent sound system. The undisputed champion of the 'Super-GoGo' era.",
      address: "113/2 Walking Street, Pattaya",
    },
  },
  {
    slug: "pin-up-a-go-go",
    data: {
      description: "Popular GoGo bar on Walking Street with retro pin-up theme. Known for good-looking dancers and fun atmosphere.",
      address: "547/18 Walking Street, Pattaya",
    },
  },
  {
    slug: "iron-club",
    data: {
      description: "GoGo bar on Walking Street with industrial metal decor. Regularly featured in Pattaya nightlife guides. Good lineup of dancers.",
      hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
    },
  },
  {
    slug: "skyfall-agogo",
    data: {
      description: "Huge GoGo bar on Walking Street with two stages that can host up to 100 girls on busy nights. Professional staff, great atmosphere. One of the top venues in Pattaya.",
      address: "Walking Street, Pattaya",
    },
  },
  {
    slug: "chick-gogo-club",
    data: {
      description: "One of the newest and biggest GoGo bars on Walking Street. Three stages, many dancers, modern design. Quickly became one of the best GoGo bars in Pattaya.",
      address: "109 Moo 10, Walking Street, Pattaya",
    },
  },
  {
    slug: "dragon-agogo-club",
    data: {
      description: "One of the newest GoGo bars on Walking Street. Modern interior with dragon-themed decor.",
      address: "40 Walking Street, Pattaya",
    },
  },
  {
    slug: "tahitian-queen",
    data: {
      description: "Historic GoGo bar on Beach Road, one of the oldest in Pattaya. Open since the 1970s, it operates as a daytime and early evening GoGo. A real institution.",
      address: "280/2 Beach Road, Pattaya",
    },
  },
  {
    slug: "peppermint-a-go-go",
    data: {
      description: "One of the largest GoGo bars on Walking Street with around 100 dancers. Classic Pattaya venue known for its size and variety.",
      address: "Walking Street, Pattaya",
    },
  },
  {
    slug: "lk-angels",
    data: {
      description: "Popular GoGo bar in LK Metro area. Good selection of girls at more affordable prices than Walking Street.",
      address: "33/124 Moo 10, LK Metro, Pattaya",
    },
  },
  {
    slug: "top-gun-agogo",
    data: {
      description: "Large GoGo bar in LK Metro with prominent facade. One of the longest-running GoGo bars in the area.",
      address: "LK Metro, Pattaya",
    },
  },
  {
    slug: "sugar-sugar-agogo",
    data: {
      description: "Popular GoGo bar in LK Metro known for good value. Part of the Sugar group of bars.",
      address: "LK Metro, Pattaya",
    },
  },
  {
    slug: "queen-club-lk-metro",
    data: {
      description: "One of the biggest and most historic GoGo bars in LK Metro. Often recommended for its large selection of dancers.",
      address: "LK Metro, Pattaya",
    },
  },
  // Fix Champagne hours (currently empty)
  {
    slug: "champagne-agogo-lk-metro",
    data: {
      description: "Reopened GoGo bar in LK Metro. Regularly updated and cited in nightlife reports.",
      hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
    },
  },

  // ── Nightclubs ─────────────────────────────────────────────────────────────
  {
    slug: "lucifer",
    data: {
      description: "One of the oldest and most iconic nightclubs on Walking Street. Recently underwent a major makeover as Lucifer 2.0. Multiple music zones including hip-hop, EDM, pop, and rock. Free entry. A Pattaya legend.",
      address: "234/6 Moo 10, Walking Street, Pattaya",
    },
  },
  {
    slug: "club-insomnia-ibar",
    data: {
      description: "One of the most energetic nightclubs on Walking Street and historically one of the last to close. iBar downstairs offers hip-hop, house, and Thai music. Ranked #90 on DJ Mag's 2025 Top Clubs in the World list.",
      address: "110/2 Walking Street, Pattaya",
    },
  },
  {
    slug: "differ-pub-pattaya",
    data: {
      description: "One of Pattaya's nightclub giants, operating since 2004. Grand venue in North Pattaya with live music and EDM. Popular with both Thais and expats.",
      address: "155 Phettrakul Road, North Pattaya",
    },
  },
  {
    slug: "flexx-club-pattaya",
    data: {
      description: "After-hours hip-hop / R&B / Afro club near Walking Street. Known for staying open until 7am. Popular late-night spot.",
      address: "Soi Soho Square, Walking Street, Pattaya",
    },
  },
  {
    slug: "club-panda",
    data: {
      description: "Super club with EDM focus, extremely popular with Asian clientele. One of the biggest clubs on Walking Street.",
      address: "139/15 Walking Street, Pattaya",
    },
  },

  // ── BJ Bars ────────────────────────────────────────────────────────────────
  {
    slug: "club-4-bj-bar",
    data: {
      description: "The first BJ bar to open on Soi Bongkot 8, pioneering the 'BJ alley' concept. Standard BJ bar format with beer included in the price.",
      address: "417/31 Soi Bongkot 8, Pattaya",
    },
  },
  {
    slug: "pirates-hostess-club",
    data: {
      description: "BJ bar on Soi Bongkot 8, next to 007 Club and Club 4. Known for its competitive pricing and relaxed atmosphere.",
      address: "417/33 Soi Bongkot 8, Pattaya",
    },
  },
  {
    slug: "kittens-bar",
    data: {
      description: "Modern BJ bar on Soi 13/2 with new decor and large screens. One of the better-known BJ bars outside Soi Bongkot.",
      address: "Soi Pattaya 13/2, Pattaya",
    },
  },
  {
    slug: "pump-station-1",
    data: {
      description: "One of the historic BJ bars on Soi 13/2. Standard service in enclosed booths.",
      address: "183/59 Moo 10, Soi Pattaya 13/2, Pattaya",
    },
  },
  {
    slug: "king-kong",
    data: {
      description: "BJ bar on Soi 6 with affordable pricing (around 800 THB + tip). Casual Soi 6 atmosphere.",
      address: "Soi 6, Pattaya",
    },
  },

  // ── Ladyboy GoGo ───────────────────────────────────────────────────────────
  // Peachy Lily is PROTECTED — skip

  // ── Ladyboy Bars ───────────────────────────────────────────────────────────
  {
    slug: "sensations-ladyboy-bar",
    data: {
      description: "Very popular ladyboy bar on Soi Buakhao. Described as the best ladyboy bar in the area with beautiful and friendly ladyboys.",
      address: "111 Soi Buakhao, Pattaya",
    },
  },
  {
    slug: "lita-bar",
    data: {
      description: "Long-running institution among Pattaya's ladyboy bars. Small, intimate setting near Walking Street. One of the most well-known ladyboy bars in the city.",
      address: "Pattaya Sai 2 Road, Pattaya",
    },
  },
  {
    slug: "le-pub",
    data: {
      description: "Ladyboy-friendly bar on Walking Street with cabaret shows and entertainment. Popular YouTube presence.",
      address: "175/15 Moo 10, Walking Street, Pattaya",
    },
  },

  // ── Gay Bars ───────────────────────────────────────────────────────────────
  {
    slug: "boy-town-pattaya",
    data: {
      description: "The main hub of Pattaya's gay nightlife scene in Boyztown (off Walking Street). Multiple bars and entertainment venues.",
      address: "Boyztown, Pattaya",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NEW VENUES: major well-known venues missing from the database
// ═══════════════════════════════════════════════════════════════════════════════
// Only add venues that are verified to exist from multiple sources.
const NEW_VENUES = [
  // ── GoGo Bars ──────────────────────────────────────────────────────────────
  {
    categorySlug: "gogo-bar",
    name: "Happy A Go Go",
    slug: "happy-a-go-go",
    description: "The oldest GoGo bar on Walking Street, open for over 25 years. Located at the end of Soi Happy (between Soi 15 and Soi 16). A Pattaya institution.",
    address: "Soi Happy, Walking Street, Pattaya",
    lat: 12.9264,
    lng: 100.8734,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "gogo-bar",
    name: "Airport Club",
    slug: "airport-club",
    description: "Outstanding GoGo bar on Soi Diamond (off Walking Street) with an airlines theme. Dancers in air hostess uniforms, center jacuzzi. Premium venue with higher drink prices.",
    address: "Soi Diamond, Walking Street, Pattaya",
    lat: 12.9258,
    lng: 100.8738,
    hours: '{"Mon":{"open":"20:00","close":"03:30","closed":false},"Tue":{"open":"20:00","close":"03:30","closed":false},"Wed":{"open":"20:00","close":"03:30","closed":false},"Thu":{"open":"20:00","close":"03:30","closed":false},"Fri":{"open":"20:00","close":"03:30","closed":false},"Sat":{"open":"20:00","close":"03:30","closed":false},"Sun":{"open":"20:00","close":"03:30","closed":false}}',
  },
  {
    categorySlug: "gogo-bar",
    name: "Imperia (Living Dolls)",
    slug: "imperia-living-dolls",
    description: "One of the longest-running GoGo bars on Walking Street, formerly known as Living Dolls. Recently rebranded as Imperia. A Pattaya classic.",
    address: "Walking Street, Pattaya",
    lat: 12.9270,
    lng: 100.8739,
    hours: '{"Mon":{"open":"20:00","close":"04:00","closed":false},"Tue":{"open":"20:00","close":"04:00","closed":false},"Wed":{"open":"20:00","close":"04:00","closed":false},"Thu":{"open":"20:00","close":"04:00","closed":false},"Fri":{"open":"20:00","close":"04:00","closed":false},"Sat":{"open":"20:00","close":"04:00","closed":false},"Sun":{"open":"20:00","close":"04:00","closed":false}}',
  },
  {
    categorySlug: "gogo-bar",
    name: "Harem A Go Go",
    slug: "harem-a-go-go",
    description: "GoGo bar on Walking Street listed in the current Pattaya nightlife guides.",
    address: "Walking Street, Pattaya",
    lat: 12.9265,
    lng: 100.8735,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "gogo-bar",
    name: "Fever A Go Go",
    slug: "fever-a-go-go",
    description: "GoGo bar in the LK Metro area. Part of the LK Metro nightlife strip.",
    address: "LK Metro, Pattaya",
    lat: 12.9298,
    lng: 100.8845,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "gogo-bar",
    name: "Oasis Cocktail Lounge",
    slug: "oasis-cocktail-lounge",
    description: "GoGo/lounge bar in LK Metro, formerly known as Slutz. Cocktail-focused with dancers.",
    address: "LK Metro, Pattaya",
    lat: 12.9297,
    lng: 100.8843,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },

  // ── Nightclubs ─────────────────────────────────────────────────────────────
  {
    categorySlug: "club",
    name: "Mixx Discotheque",
    slug: "mixx-discotheque",
    description: "One of the founding fathers of Walking Street's nightclub scene, operating since 2007. One of Pattaya's largest nightclubs with two areas: Crystal Palace (house/techno/trance) and Rouge Club (hip-hop/R&B). Free admission with Happy Hour buy-1-get-1 from 10pm to midnight.",
    address: "311 Moo 10, Bali Hai Plaza 3rd Floor, Walking Street, Pattaya",
    lat: 12.9250,
    lng: 100.8707,
    phone: "+66 96 216 2612",
    hours: '{"Mon":{"open":"21:00","close":"04:00","closed":false},"Tue":{"open":"21:00","close":"04:00","closed":false},"Wed":{"open":"21:00","close":"04:00","closed":false},"Thu":{"open":"21:00","close":"04:00","closed":false},"Fri":{"open":"21:00","close":"04:00","closed":false},"Sat":{"open":"21:00","close":"04:00","closed":false},"Sun":{"open":"21:00","close":"04:00","closed":false}}',
    website: "https://www.facebook.com/mixxdiscotheque/",
  },

  // ── Ladyboy GoGo ───────────────────────────────────────────────────────────
  {
    categorySlug: "ladyboy-gogo",
    name: "Obsession",
    slug: "obsession",
    description: "Probably the best ladyboy GoGo club in Pattaya. Located on Soi Pattayaland 2, next to Penthouse Hotel. Sexy ladyboy dancers and professional shows. Usually not crowded, with some of the most passable ladyboys in town.",
    address: "Soi Pattayaland 2, Pattaya",
    lat: 12.9268,
    lng: 100.8754,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "ladyboy-gogo",
    name: "Jenny Star Bar",
    slug: "jenny-star-bar",
    description: "Probably the best-known ladyboy bar on Walking Street, if not all of Pattaya. Located on the right side of Walking Street near the Marine Disco escalator. A Pattaya institution for ladyboy entertainment.",
    address: "Walking Street, Pattaya",
    lat: 12.9260,
    lng: 100.8725,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },

  // ── Gentleman's Club ──────────────────────────────────────────────────────
  {
    categorySlug: "gentlemans-club",
    name: "Lollipop Agogo",
    slug: "lollipop-agogo",
    description: "Well-known gentleman's club / GoGo bar in Pattaya. Popular with expats.",
    address: "Walking Street, Pattaya",
    lat: 12.9265,
    lng: 100.8736,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "gentlemans-club",
    name: "Baby Dolls Agogo",
    slug: "baby-dolls-agogo",
    description: "Gentleman's club on Soi 15 off Walking Street. Staff escort you to the venue which is at the far end of the soi. Intimate setting.",
    address: "Soi 15, Walking Street, Pattaya",
    lat: 12.9262,
    lng: 100.8738,
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
  {
    categorySlug: "gentlemans-club",
    name: "Secrets Gentleman's Club",
    slug: "secrets-gentlemans-club",
    description: "Discreet gentleman's club in the Pattaya nightlife area. Known for privacy and quality service.",
    address: "Pattaya",
    hours: '{"Mon":{"open":"20:00","close":"03:00","closed":false},"Tue":{"open":"20:00","close":"03:00","closed":false},"Wed":{"open":"20:00","close":"03:00","closed":false},"Thu":{"open":"20:00","close":"03:00","closed":false},"Fri":{"open":"20:00","close":"03:00","closed":false},"Sat":{"open":"20:00","close":"03:00","closed":false},"Sun":{"open":"20:00","close":"03:00","closed":false}}',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DELETIONS: duplicate or non-existent venues to remove
// ═══════════════════════════════════════════════════════════════════════════════
// Only delete venues that have 0 ratings AND 0 comments.
const VENUE_DELETIONS = [
  // Duplicate: Shark A Go Go is same venue as Shark Club A Go Go (identical coords)
  { slug: "shark-a-go-go", reason: "Duplicate of shark-club-a-go-go (same GPS coordinates)" },

  // Duplicate: Peppermint Club is same venue as Peppermint A Go Go (identical coords, no hours)
  { slug: "peppermint-club", reason: "Duplicate of peppermint-a-go-go (same GPS coordinates)" },

  // Duplicate: Lucifer Music Café is same venue as Lucifer (adjacent coords, same website)
  { slug: "lucifer-music-cafe-bar", reason: "Duplicate of lucifer (same venue, same website)" },

  // Duplicate: One Night Jack Pattaya vs One Night Jack (identical coords, different category)
  { slug: "one-night-jack-pattaya", reason: "Duplicate of one-night-jack (same GPS, club vs gogo)" },

  // Duplicate: Dick Inn Beer Bar Pattaya vs Dick Inn Beer Bar (identical coords)
  { slug: "dick-inn-beer-bar-pattaya", reason: "Duplicate of dick-inn-beer-bar (same GPS coordinates)" },

  // Duplicate: Emmy's Bar Jomtien vs Emmy's Ladyboy Bar (identical coords)
  { slug: "emmys-bar-jomtien-soi2", reason: "Duplicate of emmys-ladyboy-bar (same GPS coordinates)" },

  // Duplicate: Jomtien Complex Walking Street (Thai name) vs Jomtien Complex Walking Street
  { slug: "jomtien-complex-walking-street-", reason: "Duplicate of jomtien-complex-walking-street (same venue)" },

  // Duplicate: @Home bar vs @Home Bar Jomtien (identical coords)
  { slug: "home-bar", reason: "Duplicate of home-bar-jomtien (same GPS coordinates)" },

  // Duplicate: Skyfall Agogo is gogo-bar, Skyfall Club Pattaya is club category — same coords, same venue
  { slug: "skyfall-club-pattaya", reason: "Duplicate of skyfall-agogo (same GPS, it's a GoGo not a club)" },

  // Duplicate: Cocka2 Ladyboy Bar vs Soi Chaiyapoon Ladyboy Bars (identical coords)
  { slug: "soi-chaiyapoon-ladyboy-bars", reason: "Duplicate of cocka2-ladyboy-bar (same GPS, generic name)" },

  // Duplicate: CLUB 555 Ladyboy Gents Club vs CLUB 555 (same venue)
  { slug: "club-555-ladyboy-gents-club", reason: "Duplicate of club-555 (same venue)" },

  // Duplicate: Carre Blanc Le Club vs Carre Blanc (same venue)
  { slug: "carre-blanc-le-club", reason: "Duplicate of carre-blanc (same venue)" },

  // Duplicate: Soi Bongkot Ladyboy Gents Cluster — this is an area, not a venue
  { slug: "soi-bongkot-ladyboy-gents-cluster", reason: "Not a real venue — describes an area" },

  // Duplicate: Soi 6 Ladyboy Club Rooms — this is an area description, not a venue
  { slug: "soi-6-ladyboy-club-rooms", reason: "Not a real venue — describes an area" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`VENUE UPDATE SCRIPT — ${DRY_RUN ? "DRY RUN (no changes will be saved)" : "APPLYING CHANGES"}`);
  console.log(`${"═".repeat(80)}\n`);

  // ── Load category map ────────────────────────────────────────────────────
  const categories = await p.category.findMany();
  const catBySlug = {};
  for (const c of categories) catBySlug[c.slug] = c;

  // ── Load all venues for quick slug lookup ────────────────────────────────
  const allVenues = await p.venue.findMany({
    include: { _count: { select: { venueRatings: true, venueComments: true } } },
  });
  const venueBySlug = {};
  for (const v of allVenues) venueBySlug[v.slug] = v;

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 1: UPDATE existing venues
  // ═════════════════════════════════════════════════════════════════════════
  console.log("─── PHASE 1: UPDATES ───────────────────────────────────────────");
  for (const upd of VENUE_UPDATES) {
    const venue = venueBySlug[upd.slug];
    if (!venue) {
      console.log(`  [SKIP] ${upd.slug} — not found in database`);
      continue;
    }
    if (PROTECTED_SLUGS.includes(upd.slug)) {
      console.log(`  [PROTECTED] ${upd.slug} — skipping (has ratings/comments)`);
      statsSkippedProtected++;
      continue;
    }

    // Build the actual update payload: only update fields that are currently empty or explicitly need correction
    const payload = {};
    const changes = [];
    for (const [key, val] of Object.entries(upd.data)) {
      if (val === null || val === undefined) continue;

      // For description: update if currently empty or the generic "(none)"
      if (key === "description") {
        if (!venue.description || venue.description === "(none)") {
          payload[key] = val;
          changes.push(`description: (empty) → "${val.substring(0, 50)}..."`);
        }
        continue;
      }
      // For address: update if it's a vague Google-generated address
      if (key === "address") {
        const currentAddr = (venue.address || "").toLowerCase();
        const isVague =
          !venue.address ||
          currentAddr.includes("pattaya city, bang lamung") ||
          currentAddr.includes("muang pattaya, amphoe bang lamung") ||
          currentAddr.includes("pluak daeng");
        if (isVague) {
          payload[key] = val;
          changes.push(`address: "${(venue.address || "").substring(0, 40)}" → "${val}"`);
        }
        continue;
      }
      // For hours: only set if currently empty
      if (key === "hours") {
        const hasHours = venue.hours && venue.hours !== "{}" && venue.hours !== "null" && venue.hours !== "";
        if (!hasHours) {
          payload[key] = val;
          changes.push(`hours: (empty) → set`);
        }
        continue;
      }
      // For other fields: only set if currently empty
      if (!venue[key]) {
        payload[key] = val;
        changes.push(`${key}: (empty) → "${String(val).substring(0, 40)}"`);
      }
    }

    if (Object.keys(payload).length > 0) {
      console.log(`  [UPDATE] ${upd.slug}:`);
      for (const c of changes) console.log(`           ${c}`);
      if (!DRY_RUN) {
        await p.venue.update({ where: { id: venue.id }, data: payload });
      }
      statsUpdated++;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 2: ADD new venues
  // ═════════════════════════════════════════════════════════════════════════
  console.log("\n─── PHASE 2: NEW VENUES ────────────────────────────────────────");
  for (const nv of NEW_VENUES) {
    // Check if slug already exists
    if (venueBySlug[nv.slug]) {
      console.log(`  [SKIP] ${nv.slug} — already exists in database`);
      continue;
    }
    const cat = catBySlug[nv.categorySlug];
    if (!cat) {
      console.log(`  [ERROR] ${nv.slug} — category ${nv.categorySlug} not found!`);
      continue;
    }

    const createData = {
      name: nv.name,
      slug: nv.slug,
      description: nv.description || null,
      address: nv.address || null,
      lat: nv.lat || null,
      lng: nv.lng || null,
      hours: nv.hours || null,
      phone: nv.phone || null,
      website: nv.website || null,
      facebook: nv.facebook || null,
      instagram: nv.instagram || null,
      isActive: true,
      category: { connect: { id: cat.id } },
    };

    console.log(`  [ADD] ${nv.name} → [${nv.categorySlug}]`);
    console.log(`        slug: ${nv.slug}`);
    console.log(`        addr: ${nv.address || "(none)"}`);
    console.log(`        GPS:  ${nv.lat || "null"}, ${nv.lng || "null"}`);
    console.log(`        desc: "${(nv.description || "").substring(0, 60)}..."`);

    if (!DRY_RUN) {
      await p.venue.create({ data: createData });
    }
    statsAdded++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 3: DELETE duplicates and non-existent venues
  // ═════════════════════════════════════════════════════════════════════════
  console.log("\n─── PHASE 3: DELETIONS ─────────────────────────────────────────");
  for (const del of VENUE_DELETIONS) {
    const venue = venueBySlug[del.slug];
    if (!venue) {
      console.log(`  [SKIP] ${del.slug} — not found in database`);
      continue;
    }
    if (PROTECTED_SLUGS.includes(del.slug)) {
      console.log(`  [PROTECTED] ${del.slug} — cannot delete (has ratings/comments)`);
      statsSkippedProtected++;
      continue;
    }
    // Double-check: never delete a venue with ratings or comments
    if (venue._count.venueRatings > 0 || venue._count.venueComments > 0) {
      console.log(`  [PROTECTED] ${del.slug} — has ${venue._count.venueRatings} ratings, ${venue._count.venueComments} comments`);
      statsSkippedProtected++;
      continue;
    }

    console.log(`  [DELETE] ${venue.name} (${del.slug})`);
    console.log(`           Reason: ${del.reason}`);

    if (!DRY_RUN) {
      await p.venue.delete({ where: { id: venue.id } });
    }
    statsDeleted++;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═════════════════════════════════════════════════════════════════════════
  console.log(`\n${"═".repeat(80)}`);
  console.log(`SUMMARY ${DRY_RUN ? "(DRY RUN — nothing was changed)" : "(CHANGES APPLIED)"}`);
  console.log(`${"═".repeat(80)}`);
  console.log(`  Venues updated:          ${statsUpdated}`);
  console.log(`  New venues added:        ${statsAdded}`);
  console.log(`  Venues deleted:          ${statsDeleted}`);
  console.log(`  Skipped (protected):     ${statsSkippedProtected}`);
  console.log(`${"═".repeat(80)}\n`);

  if (DRY_RUN) {
    console.log("To apply these changes, run:  node scripts/update-venues.js --apply\n");
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
