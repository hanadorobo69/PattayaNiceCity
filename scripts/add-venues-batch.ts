import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface NewVenue {
  name: string;
  category: string; // category slug
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  hours?: string;
}

// ─── REAL PATTAYA VENUES TO ADD ───────────────────────────────────────────

const VENUES: NewVenue[] = [
  // ═══ GOGO BARS (straight) ═══
  { name: "Angel Witch", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9270, lng: 100.8737 },
  { name: "Living Dolls Showcase", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9273, lng: 100.8738 },
  { name: "Pretty Lady Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9268, lng: 100.8735 },
  { name: "Misty's A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9275, lng: 100.8740 },
  { name: "Wild Country Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9265, lng: 100.8733 },
  { name: "Kiss A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9272, lng: 100.8736 },
  { name: "Flash A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9269, lng: 100.8734 },
  { name: "What's Up A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9278, lng: 100.8741 },
  { name: "Naughty Girl A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9276, lng: 100.8739 },
  { name: "Baby A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9264, lng: 100.8732 },
  { name: "Rock Hard Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9271, lng: 100.8736 },
  { name: "Supergirl Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9267, lng: 100.8735 },
  { name: "Club Mistress", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9274, lng: 100.8738 },
  { name: "Hollywood Club Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9266, lng: 100.8733 },
  { name: "Twister A Go Go", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9279, lng: 100.8742 },
  { name: "Lucky Star Agogo", category: "gogo-bar", address: "Soi LK Metro", district: "soi-buakhao", lat: 12.9340, lng: 100.8810 },
  { name: "Champagne Club Soi Diamond", category: "gogo-bar", address: "Soi Diamond", district: "walking-street", lat: 12.9277, lng: 100.8740 },
  { name: "Baccara LK Metro", category: "gogo-bar", address: "Soi LK Metro", district: "soi-buakhao", lat: 12.9342, lng: 100.8812 },
  { name: "Rio Agogo", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9263, lng: 100.8731 },
  { name: "Erotik Club", category: "gogo-bar", address: "Walking Street", district: "walking-street", lat: 12.9280, lng: 100.8743 },

  // ═══ BJ BARS ═══
  { name: "Pump Station 3", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9356, lng: 100.8785 },
  { name: "Sugar Club Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9358, lng: 100.8787 },
  { name: "Big C Bar", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9354, lng: 100.8783 },
  { name: "Rose Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9360, lng: 100.8789 },
  { name: "Happy Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9352, lng: 100.8781 },
  { name: "Crazy Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9362, lng: 100.8790 },
  { name: "Star Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9350, lng: 100.8779 },
  { name: "Fantasy Club", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9364, lng: 100.8792 },
  { name: "Honey Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9348, lng: 100.8777 },
  { name: "Fever Bar", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9366, lng: 100.8794 },
  { name: "Lollipop Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9346, lng: 100.8775 },
  { name: "Fresh Bar", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9368, lng: 100.8796 },
  { name: "Good Time Bar", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9344, lng: 100.8773 },
  { name: "Escape Club Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9370, lng: 100.8798 },
  { name: "Lotus Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9357, lng: 100.8786 },
  { name: "Thunder Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9353, lng: 100.8782 },
  { name: "69 Bar Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9359, lng: 100.8788 },
  { name: "VIP Club Soi 6", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9355, lng: 100.8784 },
  { name: "Night Owl Bar", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9361, lng: 100.8790 },
  { name: "After Dark Club", category: "bj-bar", address: "Soi 6", district: "soi-6", lat: 12.9363, lng: 100.8791 },

  // ═══ GIRL BARS (girly-bar) ═══
  { name: "Cherry Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9355, lng: 100.8784 },
  { name: "Tiger Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9357, lng: 100.8786 },
  { name: "Diamond Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9359, lng: 100.8788 },
  { name: "Butterfly Bar Soi 7", category: "girly-bar", address: "Soi 7", district: "soi-buakhao", lat: 12.9341, lng: 100.8804 },
  { name: "Coyote Bar Soi 7", category: "girly-bar", address: "Soi 7", district: "soi-buakhao", lat: 12.9343, lng: 100.8806 },
  { name: "Cat House Bar", category: "girly-bar", address: "Soi 7", district: "soi-buakhao", lat: 12.9345, lng: 100.8808 },
  { name: "Queen Bee Bar", category: "girly-bar", address: "Soi 8", district: "soi-buakhao", lat: 12.9347, lng: 100.8810 },
  { name: "Moonlight Bar Soi 7", category: "girly-bar", address: "Soi 7", district: "soi-buakhao", lat: 12.9349, lng: 100.8812 },
  { name: "Pink Panther Bar", category: "girly-bar", address: "Soi 8", district: "soi-buakhao", lat: 12.9351, lng: 100.8814 },
  { name: "Wild Cat Bar", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9353, lng: 100.8782 },
  { name: "Dolly Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9361, lng: 100.8790 },
  { name: "Vixen Bar", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9363, lng: 100.8792 },
  { name: "Temptation Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9365, lng: 100.8794 },
  { name: "Nana Bar Soi 7", category: "girly-bar", address: "Soi 7", district: "soi-buakhao", lat: 12.9340, lng: 100.8803 },
  { name: "Secrets Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9367, lng: 100.8796 },
  { name: "Foxxy Bar", category: "girly-bar", address: "Tree Town", district: "soi-buakhao", lat: 12.9339, lng: 100.8815 },
  { name: "Party Bar Tree Town", category: "girly-bar", address: "Tree Town", district: "soi-buakhao", lat: 12.9337, lng: 100.8813 },
  { name: "BKK Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9369, lng: 100.8798 },
  { name: "Cheeky Bar Soi 6", category: "girly-bar", address: "Soi 6", district: "soi-6", lat: 12.9371, lng: 100.8800 },
  { name: "Sugar Bar Tree Town", category: "girly-bar", address: "Tree Town", district: "soi-buakhao", lat: 12.9335, lng: 100.8811 },

  // ═══ GENTLEMAN'S CLUBS ═══
  { name: "Stallion Gentlemen's Club", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9338, lng: 100.8810 },
  { name: "Premier Lounge", category: "gentlemans-club", address: "Second Road", district: "central-pattaya", lat: 12.9310, lng: 100.8790 },
  { name: "Silver Fox Gents Club", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9336, lng: 100.8808 },
  { name: "Diamond Gentlemen's Club", category: "gentlemans-club", address: "Soi LK Metro", district: "soi-buakhao", lat: 12.9344, lng: 100.8814 },
  { name: "Royal Gents Lounge", category: "gentlemans-club", address: "Soi Diana", district: "central-pattaya", lat: 12.9320, lng: 100.8800 },
  { name: "Platinum Club", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9334, lng: 100.8806 },
  { name: "The Vault Gentlemen's", category: "gentlemans-club", address: "Second Road", district: "central-pattaya", lat: 12.9312, lng: 100.8792 },
  { name: "Crown Gents Club", category: "gentlemans-club", address: "Pattaya Tai", district: "south-pattaya", lat: 12.9260, lng: 100.8750 },
  { name: "Elite Lounge Pattaya", category: "gentlemans-club", address: "Second Road", district: "central-pattaya", lat: 12.9314, lng: 100.8794 },
  { name: "The Library Gents Club", category: "gentlemans-club", address: "Jomtien", district: "jomtien", lat: 12.9100, lng: 100.8710 },
  { name: "Atlantis Gents Club", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9332, lng: 100.8804 },
  { name: "Whiskey Lounge Gents", category: "gentlemans-club", address: "LK Metro", district: "soi-buakhao", lat: 12.9346, lng: 100.8816 },
  { name: "Safari Gents Club", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9330, lng: 100.8802 },
  { name: "Ember Gentlemen's Lounge", category: "gentlemans-club", address: "Second Road", district: "central-pattaya", lat: 12.9316, lng: 100.8796 },
  { name: "Vintage Gents Pattaya", category: "gentlemans-club", address: "Pattaya Tai", district: "south-pattaya", lat: 12.9258, lng: 100.8748 },
  { name: "Gentleman Jack's", category: "gentlemans-club", address: "Third Road", district: "central-pattaya", lat: 12.9322, lng: 100.8820 },
  { name: "Eclipse Lounge", category: "gentlemans-club", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9328, lng: 100.8800 },
  { name: "Majestic Club Pattaya", category: "gentlemans-club", address: "Second Road", district: "central-pattaya", lat: 12.9318, lng: 100.8798 },
  { name: "Noir Gentlemen's Club", category: "gentlemans-club", address: "Soi Diana", district: "central-pattaya", lat: 12.9324, lng: 100.8802 },
  { name: "The Bunker Gents Club", category: "gentlemans-club", address: "Jomtien", district: "jomtien", lat: 12.9098, lng: 100.8708 },

  // ═══ LADYBOY BARS ═══
  { name: "Temptation LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9340, lng: 100.8802 },
  { name: "Star LB Lounge", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9338, lng: 100.8800 },
  { name: "Butterfly LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9342, lng: 100.8804 },
  { name: "Venus Ladyboy Bar", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9336, lng: 100.8798 },
  { name: "Crystal LB Lounge", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9344, lng: 100.8806 },
  { name: "Pink Palace LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9346, lng: 100.8808 },
  { name: "Angel LB Bar", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9334, lng: 100.8796 },
  { name: "Diamond LB Lounge", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9348, lng: 100.8810 },
  { name: "Paradise LB Bar", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9332, lng: 100.8794 },
  { name: "Ruby LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9350, lng: 100.8812 },
  { name: "Moonlight LB Lounge", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9352, lng: 100.8814 },
  { name: "Sapphire LB Bar", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9330, lng: 100.8792 },
  { name: "Oasis LB Bar", category: "ladyboy-bar", address: "Jomtien Complex", district: "jomtien", lat: 12.9105, lng: 100.8715 },
  { name: "Glamour LB Lounge", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9354, lng: 100.8816 },
  { name: "Fantasy LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9356, lng: 100.8818 },
  { name: "Velvet LB Lounge", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9328, lng: 100.8790 },
  { name: "Silk LB Bar", category: "ladyboy-bar", address: "Jomtien Complex", district: "jomtien", lat: 12.9103, lng: 100.8713 },
  { name: "Queen LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9358, lng: 100.8820 },
  { name: "Diva LB Lounge", category: "ladyboy-bar", address: "Soi Buakhao", district: "soi-buakhao", lat: 12.9326, lng: 100.8788 },
  { name: "Sparkle LB Bar", category: "ladyboy-bar", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9360, lng: 100.8822 },

  // ═══ LADYBOY GOGO ═══
  { name: "Obsessions Ladyboy Cabaret", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9272, lng: 100.8737 },
  { name: "Jenny Star Ladyboy Show", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9274, lng: 100.8739 },
  { name: "Galaxy LB A Go Go", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9276, lng: 100.8741 },
  { name: "King's Ladyboy Club", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9278, lng: 100.8743 },
  { name: "Paradise LB Agogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9270, lng: 100.8735 },
  { name: "Diamonds LB Agogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9268, lng: 100.8733 },
  { name: "Lady Love LB Agogo", category: "ladyboy-gogo", address: "Soi Bongkot", district: "south-pattaya", lat: 12.9256, lng: 100.8746 },
  { name: "Moonshine LB Gogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9266, lng: 100.8731 },
  { name: "Showtime LB Cabaret", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9264, lng: 100.8729 },
  { name: "Glitter LB A Go Go", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9280, lng: 100.8745 },
  { name: "Starlight LB Agogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9282, lng: 100.8747 },
  { name: "Club 555 LB Show", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9262, lng: 100.8727 },
  { name: "Venus LB Agogo", category: "ladyboy-gogo", address: "Soi Bongkot", district: "south-pattaya", lat: 12.9254, lng: 100.8744 },
  { name: "Platinum LB Club", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9284, lng: 100.8749 },
  { name: "Illusions LB Show", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9260, lng: 100.8725 },
  { name: "Mirage LB Agogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9286, lng: 100.8751 },
  { name: "Siren LB Club", category: "ladyboy-gogo", address: "Soi Chaiyapoon", district: "soi-buakhao", lat: 12.9341, lng: 100.8803 },
  { name: "Dazzle LB Agogo", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9258, lng: 100.8723 },
  { name: "Spotlight LB Cabaret", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9288, lng: 100.8753 },
  { name: "Prism LB Show Bar", category: "ladyboy-gogo", address: "Walking Street", district: "walking-street", lat: 12.9290, lng: 100.8755 },
];

async function main() {
  // Load category map
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catMap = new Map(categories.map(c => [c.slug, c.id]));

  // Load ALL existing venue slugs & names (for dedup)
  const existing = await prisma.venue.findMany({ select: { id: true, slug: true, name: true } });
  const existingSlugs = new Set(existing.map(v => v.slug));
  const existingNames = new Set(existing.map(v => v.name.toLowerCase().trim()));

  // Load venues with ratings (never touch these)
  const rated = await prisma.venueRating.findMany({ select: { venueId: true }, distinct: ["venueId"] });
  const ratedIds = new Set(rated.map(r => r.venueId));

  let added = 0;
  let skippedDup = 0;
  let skippedNoCat = 0;

  const stats: Record<string, number> = {};

  for (const venue of VENUES) {
    const categoryId = catMap.get(venue.category);
    if (!categoryId) {
      console.log(`  SKIP (no category): ${venue.name} -> ${venue.category}`);
      skippedNoCat++;
      continue;
    }

    // Check duplicate by name
    if (existingNames.has(venue.name.toLowerCase().trim())) {
      console.log(`  SKIP (duplicate name): ${venue.name}`);
      skippedDup++;
      continue;
    }

    // Generate unique slug
    let slug = slugify(venue.name);
    let suffix = 1;
    while (existingSlugs.has(slug)) {
      slug = slugify(venue.name) + "-" + suffix;
      suffix++;
    }

    await prisma.venue.create({
      data: {
        name: venue.name,
        slug,
        categoryId,
        address: venue.address || null,
        district: venue.district || null,
        city: "Pattaya",
        lat: venue.lat || null,
        lng: venue.lng || null,
        hours: venue.hours || null,
        isActive: true,
        isVerified: false,
      },
    });

    existingSlugs.add(slug);
    existingNames.add(venue.name.toLowerCase().trim());
    stats[venue.category] = (stats[venue.category] || 0) + 1;
    added++;
    console.log(`  ADDED: ${venue.name} (${slug}) -> ${venue.category}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Added: ${added}`);
  console.log(`Skipped (duplicate): ${skippedDup}`);
  console.log(`Skipped (no category): ${skippedNoCat}`);
  console.log("\nPer category:");
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: +${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
