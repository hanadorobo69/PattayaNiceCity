import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const CATEGORIES = [
  // ── 1) VIE QUOTIDIENNE & SERVICES (sortOrder 100-199) ──
  { slug: "atm-bank",          name: "ATM & Bank",          icon: "🏧", color: "#5C6BC0", sortOrder: 100 },
  { slug: "clinic-hospital",   name: "Clinic & Hospital",   icon: "🏥", color: "#5C6BC0", sortOrder: 101 },
  { slug: "pharmacy",          name: "Pharmacy",            icon: "💊", color: "#5C6BC0", sortOrder: 102 },
  { slug: "supermarket",       name: "Supermarket",         icon: "🛒", color: "#5C6BC0", sortOrder: 103 },
  { slug: "convenience-store", name: "Convenience Store",   icon: "🏪", color: "#5C6BC0", sortOrder: 104 },
  { slug: "coworking",         name: "Coworking",           icon: "💻", color: "#5C6BC0", sortOrder: 105 },
  { slug: "post-office",       name: "Post Office",         icon: "📮", color: "#5C6BC0", sortOrder: 106 },
  { slug: "laundry",           name: "Laundry",             icon: "👕", color: "#5C6BC0", sortOrder: 107 },
  { slug: "pet-services",      name: "Pet Services",        icon: "🐾", color: "#5C6BC0", sortOrder: 108 },

  // ── 2) HÉBERGEMENTS (sortOrder 200-299) ──
  { slug: "hotel",             name: "Hotel",               icon: "🏨", color: "#e8a840", sortOrder: 200 },
  { slug: "guesthouse",        name: "Guesthouse",          icon: "🏠", color: "#e8a840", sortOrder: 201 },
  { slug: "hostel",            name: "Hostel",              icon: "🛏️", color: "#e8a840", sortOrder: 202 },
  { slug: "serviced-apartment",name: "Serviced Apartment",  icon: "🏢", color: "#e8a840", sortOrder: 203 },
  { slug: "villa-rental",      name: "Villa Rental",        icon: "🏡", color: "#e8a840", sortOrder: 204 },
  { slug: "camping-glamping",  name: "Camping & Glamping",  icon: "⛺", color: "#e8a840", sortOrder: 205 },

  // ── 3) RESTAURATION & CAFÉS (sortOrder 300-399) ──
  { slug: "thai-restaurant",       name: "Thai Restaurant",       icon: "🍜", color: "#e07850", sortOrder: 300 },
  { slug: "seafood-restaurant",    name: "Seafood Restaurant",    icon: "🦐", color: "#e07850", sortOrder: 301 },
  { slug: "international-restaurant", name: "International Restaurant", icon: "🍽️", color: "#e07850", sortOrder: 302 },
  { slug: "vegetarian-vegan",      name: "Vegetarian & Vegan",    icon: "🥗", color: "#e07850", sortOrder: 303 },
  { slug: "halal-restaurant",      name: "Halal Restaurant",      icon: "🥘", color: "#e07850", sortOrder: 304 },
  { slug: "street-food",           name: "Street Food",           icon: "🍢", color: "#e07850", sortOrder: 305 },
  { slug: "cafe",                  name: "Cafe",                  icon: "☕", color: "#e07850", sortOrder: 306 },
  { slug: "bakery-dessert",        name: "Bakery & Dessert",      icon: "🧁", color: "#e07850", sortOrder: 307 },
  { slug: "buffet",                name: "Buffet",                icon: "🍱", color: "#e07850", sortOrder: 308 },
  { slug: "rooftop-restaurant",    name: "Rooftop Restaurant",    icon: "🌆", color: "#e07850", sortOrder: 309 },

  // ── 4) SORTIES & NIGHTLIFE SOFT (sortOrder 400-499) ──
  { slug: "sunset-bar",        name: "Sunset & Beach Bar",  icon: "🌅", color: "#AB47BC", sortOrder: 400 },
  { slug: "rooftop-bar",       name: "Rooftop & Sky Bar",   icon: "🍸", color: "#AB47BC", sortOrder: 401 },
  { slug: "live-music",        name: "Live Music",          icon: "🎵", color: "#AB47BC", sortOrder: 402 },
  { slug: "sports-bar",        name: "Sports Bar",          icon: "🏈", color: "#AB47BC", sortOrder: 403 },
  { slug: "karaoke-family",    name: "Karaoke (Family)",    icon: "🎤", color: "#AB47BC", sortOrder: 404 },
  { slug: "night-market",      name: "Night Market",        icon: "🏮", color: "#AB47BC", sortOrder: 405 },
  { slug: "cinema",            name: "Cinema",              icon: "🎬", color: "#AB47BC", sortOrder: 406 },

  // ── 5) ACTIVITÉS & ATTRACTIONS (sortOrder 500-599) ──
  { slug: "water-park",        name: "Water Park",          icon: "🌊", color: "#29B6F6", sortOrder: 500 },
  { slug: "theme-park",        name: "Theme Park",          icon: "🎢", color: "#29B6F6", sortOrder: 501 },
  { slug: "aquarium-zoo",      name: "Aquarium & Zoo",      icon: "🐠", color: "#29B6F6", sortOrder: 502 },
  { slug: "museum-gallery",    name: "Museum & Gallery",    icon: "🏛️", color: "#29B6F6", sortOrder: 503 },
  { slug: "temple-attraction", name: "Temple & Attraction", icon: "🛕", color: "#29B6F6", sortOrder: 504 },
  { slug: "cultural-show",     name: "Cultural Show",       icon: "🎭", color: "#29B6F6", sortOrder: 505 },
  { slug: "viewpoint",         name: "Viewpoint",           icon: "🔭", color: "#29B6F6", sortOrder: 506 },
  { slug: "farm-park",         name: "Farm Park",           icon: "🌾", color: "#29B6F6", sortOrder: 507 },
  { slug: "indoor-playground", name: "Indoor Playground",   icon: "🎠", color: "#29B6F6", sortOrder: 508 },

  // ── 6) NATURE & PLAGES (sortOrder 600-699) ──
  { slug: "beach",             name: "Beach",               icon: "🏖️", color: "#4FC3F7", sortOrder: 600 },
  { slug: "island-trip",       name: "Island Trip",         icon: "🏝️", color: "#4FC3F7", sortOrder: 601 },
  { slug: "park-garden",       name: "Park & Garden",       icon: "🌳", color: "#4FC3F7", sortOrder: 602 },
  { slug: "pier-marina",       name: "Pier & Marina",       icon: "⚓", color: "#4FC3F7", sortOrder: 603 },

  // ── 7) SHOPPING & MARCHÉS (sortOrder 700-799) ──
  { slug: "shopping-mall",     name: "Shopping Mall",       icon: "🛍️", color: "#FFA726", sortOrder: 700 },
  { slug: "market-day",        name: "Day Market",          icon: "🧺", color: "#FFA726", sortOrder: 701 },
  { slug: "market-night",      name: "Evening Market",      icon: "🏮", color: "#FFA726", sortOrder: 702 },
  { slug: "floating-market",   name: "Floating Market",     icon: "🚣", color: "#FFA726", sortOrder: 703 },
  { slug: "souvenir-shop",     name: "Souvenir Shop",       icon: "🎁", color: "#FFA726", sortOrder: 704 },

  // ── 8) BIEN-ÊTRE & SANTÉ (sortOrder 800-899) ──
  { slug: "spa-massage",       name: "Spa & Massage",       icon: "💆", color: "#3db8a0", sortOrder: 800 },
  { slug: "wellness-center",   name: "Wellness Center",     icon: "🧘", color: "#3db8a0", sortOrder: 801 },
  { slug: "beauty-salon",      name: "Beauty Salon",        icon: "💅", color: "#3db8a0", sortOrder: 802 },

  // ── 9) SPORT & AVENTURE (sortOrder 900-999) ──
  { slug: "karting",           name: "Karting",             icon: "🏎️", color: "#EF5350", sortOrder: 900 },
  { slug: "bowling",           name: "Bowling",             icon: "🎳", color: "#EF5350", sortOrder: 901 },
  { slug: "golf",              name: "Golf",                icon: "⛳", color: "#EF5350", sortOrder: 902 },
  { slug: "water-sports",      name: "Water Sports",        icon: "🏄", color: "#EF5350", sortOrder: 903 },
  { slug: "zipline-adventure", name: "Zipline & Adventure", icon: "🪂", color: "#EF5350", sortOrder: 904 },
  { slug: "fitness-gym",       name: "Fitness Gym",         icon: "🏋️", color: "#EF5350", sortOrder: 905 },
  { slug: "muay-thai-gym",     name: "Muay Thai Gym",       icon: "🥊", color: "#EF5350", sortOrder: 906 },
  { slug: "climbing-skate",    name: "Climbing & Skate",    icon: "🧗", color: "#EF5350", sortOrder: 907 },

  // ── 10) KIDS & FAMILLE (sortOrder 1000-1099) ──
  { slug: "kids-club",         name: "Kids Club",           icon: "🧒", color: "#FF8A65", sortOrder: 1000 },
  { slug: "family-activity",   name: "Family Activity",     icon: "👨‍👩‍👧‍👦", color: "#FF8A65", sortOrder: 1001 },
  { slug: "edutainment",       name: "Edutainment",         icon: "🎓", color: "#FF8A65", sortOrder: 1002 },
  { slug: "animal-experience", name: "Animal Experience",   icon: "🐘", color: "#FF8A65", sortOrder: 1003 },

  // ── 11) TRANSPORTS (sortOrder 1100-1199) ──
  { slug: "bike-rental",       name: "Motorbike Rental",    icon: "🏍️", color: "#78909C", sortOrder: 1100 },
  { slug: "car-rental",        name: "Car Rental",          icon: "🚗", color: "#78909C", sortOrder: 1101 },
  { slug: "bicycle-rental",    name: "Bicycle Rental",      icon: "🚲", color: "#78909C", sortOrder: 1102 },
  { slug: "airport-transfer",  name: "Airport Transfer",    icon: "✈️", color: "#78909C", sortOrder: 1103 },
  { slug: "bus-station",       name: "Bus Station",         icon: "🚌", color: "#78909C", sortOrder: 1104 },
  { slug: "boat-ferry",        name: "Boat & Ferry",        icon: "⛴️", color: "#78909C", sortOrder: 1105 },
  { slug: "driving-school",    name: "Driving School",      icon: "🚦", color: "#78909C", sortOrder: 1106 },

  // ── 12) ADMINISTRATION & INFOS (sortOrder 1200-1299) ──
  { slug: "immigration",       name: "Immigration",         icon: "🛂", color: "#7986CB", sortOrder: 1200 },
  { slug: "government-office", name: "Government Office",   icon: "🏛️", color: "#7986CB", sortOrder: 1201 },
  { slug: "embassy-consulate", name: "Embassy & Consulate", icon: "🏳️", color: "#7986CB", sortOrder: 1202 },
  { slug: "school-education",  name: "School & Education",  icon: "🏫", color: "#7986CB", sortOrder: 1203 },
  { slug: "language-school",   name: "Language School",     icon: "📚", color: "#7986CB", sortOrder: 1204 },

  // ── 13) CATÉGORIES "POSTS ONLY" (sortOrder 1300-1399) ──
  { slug: "general",           name: "General",             icon: "💬", color: "#78909C", sortOrder: 1300, isPostOnly: true },
  { slug: "events",            name: "Events",              icon: "🎉", color: "#e8a840", sortOrder: 1301, isPostOnly: true },
  { slug: "promo-deals",       name: "Promos & Deals",      icon: "🏷️", color: "#EF5350", sortOrder: 1302, isPostOnly: true },
  { slug: "qna",               name: "Q&A",                 icon: "❓", color: "#3db8a0", sortOrder: 1303, isPostOnly: true },
  { slug: "lost-found",        name: "Lost & Found",        icon: "🔍", color: "#FFA726", sortOrder: 1304, isPostOnly: true },
  { slug: "administration",    name: "Administration",      icon: "📋", color: "#7986CB", sortOrder: 1305, isPostOnly: true, isAdminOnly: true },
]

async function main() {
  console.log("Seeding NiceCity categories...")

  // First, delete old ViceCity categories that no longer exist
  const newSlugs = new Set(CATEGORIES.map(c => c.slug))
  const existing = await prisma.category.findMany({ select: { id: true, slug: true } })
  const toDelete = existing.filter(c => !newSlugs.has(c.slug))

  if (toDelete.length > 0) {
    // Check if any have venues or posts attached
    for (const cat of toDelete) {
      const venueCount = await prisma.venue.count({ where: { categoryId: cat.id } })
      const postCount = await prisma.post.count({ where: { categoryId: cat.id } })
      if (venueCount > 0 || postCount > 0) {
        console.log(`  SKIP delete "${cat.slug}" (has ${venueCount} venues, ${postCount} posts)`)
      } else {
        await prisma.category.delete({ where: { id: cat.id } })
        console.log(`  Deleted old category: ${cat.slug}`)
      }
    }
  }

  // Upsert all new categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
        isPostOnly: cat.isPostOnly ?? false,
        isAdminOnly: cat.isAdminOnly ?? false,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
        isPostOnly: cat.isPostOnly ?? false,
        isAdminOnly: cat.isAdminOnly ?? false,
      },
    })
  }

  const total = await prisma.category.count()
  console.log(`Done. ${total} categories in database.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
