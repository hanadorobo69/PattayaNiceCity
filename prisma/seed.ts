import { PrismaClient } from "@prisma/client";
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PattayaNiceCity database...");

  // Purge existing categories
  try { await prisma.$executeRawUnsafe(`DELETE FROM "Category"`); } catch {}
  console.log("Categories purged.");

  // -- NiceCity Family-Friendly Categories --
  const cats = [
    // Group 1: Daily Life & Services (sortOrder 100-108)
    { name: "ATM & Bank", slug: "atm-bank", description: "ATMs, banks and money exchange", color: "#2D8B75", icon: "\u{1F3E7}", sortOrder: 100 },
    { name: "Clinic & Hospital", slug: "clinic-hospital", description: "Clinics, hospitals and medical services", color: "#E05555", icon: "\u{1F3E5}", sortOrder: 101 },
    { name: "Pharmacy", slug: "pharmacy", description: "Pharmacies and drugstores", color: "#4CAF50", icon: "\u{1F48A}", sortOrder: 102 },
    { name: "Supermarket", slug: "supermarket", description: "Supermarkets and grocery stores", color: "#43A047", icon: "\u{1F6D2}", sortOrder: 103 },
    { name: "Convenience Store", slug: "convenience-store", description: "7-Eleven, FamilyMart and more", color: "#66BB6A", icon: "\u{1F3EA}", sortOrder: 104 },
    { name: "Coworking", slug: "coworking", description: "Coworking spaces and shared offices", color: "#5C6BC0", icon: "\u{1F4BB}", sortOrder: 105 },
    { name: "Post Office", slug: "post-office", description: "Post offices and shipping services", color: "#8D6E63", icon: "\u{1F4EE}", sortOrder: 106 },
    { name: "Laundry", slug: "laundry", description: "Laundry and dry cleaning services", color: "#26C6DA", icon: "\u{1F9FA}", sortOrder: 107 },
    { name: "Pet Services", slug: "pet-services", description: "Vets, pet shops and grooming", color: "#AB47BC", icon: "\u{1F43E}", sortOrder: 108 },

    // Group 2: Accommodation (sortOrder 200-205)
    { name: "Hotel", slug: "hotel", description: "Hotels and resorts", color: "#e8a840", icon: "\u{1F3E8}", sortOrder: 200 },
    { name: "Guesthouse", slug: "guesthouse", description: "Guesthouses and B&Bs", color: "#D4A03A", icon: "\u{1F3E0}", sortOrder: 201 },
    { name: "Hostel", slug: "hostel", description: "Hostels and backpacker lodges", color: "#C49030", icon: "\u{1F6CF}\uFE0F", sortOrder: 202 },
    { name: "Serviced Apartment", slug: "serviced-apartment", description: "Serviced apartments and condos", color: "#B48028", icon: "\u{1F3E2}", sortOrder: 203 },
    { name: "Villa Rental", slug: "villa-rental", description: "Villas and private pool houses", color: "#A47020", icon: "\u{1F3E1}", sortOrder: 204 },
    { name: "Camping & Glamping", slug: "camping-glamping", description: "Campsites and glamping spots", color: "#7CB342", icon: "\u26FA", sortOrder: 205 },

    // Group 3: Food & Drink (sortOrder 300-309)
    { name: "Thai Restaurant", slug: "thai-restaurant", description: "Thai cuisine restaurants", color: "#e07850", icon: "\u{1F35C}", sortOrder: 300 },
    { name: "Seafood Restaurant", slug: "seafood-restaurant", description: "Fresh seafood restaurants", color: "#EF6C35", icon: "\u{1F990}", sortOrder: 301 },
    { name: "International Restaurant", slug: "international-restaurant", description: "Western, Japanese, Korean and more", color: "#D06040", icon: "\u{1F37D}\uFE0F", sortOrder: 302 },
    { name: "Vegetarian & Vegan", slug: "vegetarian-vegan", description: "Vegetarian and vegan restaurants", color: "#66BB6A", icon: "\u{1F957}", sortOrder: 303 },
    { name: "Halal Restaurant", slug: "halal-restaurant", description: "Halal certified restaurants", color: "#26A69A", icon: "\u{1F958}", sortOrder: 304 },
    { name: "Street Food", slug: "street-food", description: "Street food stalls and food carts", color: "#FF8F00", icon: "\u{1F362}", sortOrder: 305 },
    { name: "Cafe", slug: "cafe", description: "Coffee shops and cafes", color: "#795548", icon: "\u2615", sortOrder: 306 },
    { name: "Bakery & Dessert", slug: "bakery-dessert", description: "Bakeries, ice cream and dessert shops", color: "#F48FB1", icon: "\u{1F9C1}", sortOrder: 307 },
    { name: "Buffet", slug: "buffet", description: "All-you-can-eat buffet restaurants", color: "#FF7043", icon: "\u{1F371}", sortOrder: 308 },
    { name: "Rooftop Restaurant", slug: "rooftop-restaurant", description: "Rooftop dining with views", color: "#CE6040", icon: "\u{1F306}", sortOrder: 309 },

    // Group 4: Going Out & Soft Nightlife (sortOrder 400-406)
    { name: "Sunset Bar", slug: "sunset-bar", description: "Sunset and beach bars", color: "#FF7043", icon: "\u{1F305}", sortOrder: 400 },
    { name: "Rooftop Bar", slug: "rooftop-bar", description: "Rooftop and sky bars", color: "#AB47BC", icon: "\u{1F378}", sortOrder: 401 },
    { name: "Live Music", slug: "live-music", description: "Live music venues and concerts", color: "#7E57C2", icon: "\u{1F3B5}", sortOrder: 402 },
    { name: "Sports Bar", slug: "sports-bar", description: "Sports bars with screens", color: "#42A5F5", icon: "\u{1F4FA}", sortOrder: 403 },
    { name: "Family Karaoke", slug: "karaoke-family", description: "Family-friendly karaoke venues", color: "#EC407A", icon: "\u{1F3A4}", sortOrder: 404 },
    { name: "Night Market", slug: "night-market", description: "Night markets and food markets", color: "#FFA726", icon: "\u{1F3EE}", sortOrder: 405 },
    { name: "Cinema", slug: "cinema", description: "Movie theaters and cinemas", color: "#5C6BC0", icon: "\u{1F3AC}", sortOrder: 406 },

    // Group 5: Activities & Attractions (sortOrder 500-508)
    { name: "Water Park", slug: "water-park", description: "Water parks and aquatic fun", color: "#29B6F6", icon: "\u{1F30A}", sortOrder: 500 },
    { name: "Theme Park", slug: "theme-park", description: "Amusement and theme parks", color: "#EF5350", icon: "\u{1F3A2}", sortOrder: 501 },
    { name: "Aquarium & Zoo", slug: "aquarium-zoo", description: "Aquariums, zoos and wildlife", color: "#26A69A", icon: "\u{1F420}", sortOrder: 502 },
    { name: "Museum & Gallery", slug: "museum-gallery", description: "Museums, art galleries and exhibitions", color: "#8D6E63", icon: "\u{1F3DB}\uFE0F", sortOrder: 503 },
    { name: "Temple & Attraction", slug: "temple-attraction", description: "Temples, shrines and cultural sites", color: "#FFB300", icon: "\u{1F6D5}", sortOrder: 504 },
    { name: "Cultural Show", slug: "cultural-show", description: "Cultural shows and family cabaret", color: "#CE93D8", icon: "\u{1F3AD}", sortOrder: 505 },
    { name: "Viewpoint", slug: "viewpoint", description: "Scenic viewpoints and lookouts", color: "#4DB6AC", icon: "\u{1F3D4}\uFE0F", sortOrder: 506 },
    { name: "Farm Park", slug: "farm-park", description: "Farms, petting zoos and animal parks", color: "#8BC34A", icon: "\u{1F404}", sortOrder: 507 },
    { name: "Indoor Playground", slug: "indoor-playground", description: "Indoor kids playgrounds and fun zones", color: "#FF8A65", icon: "\u{1F3A0}", sortOrder: 508 },

    // Group 6: Nature & Beaches (sortOrder 600-603)
    { name: "Beach", slug: "beach", description: "Beaches and seaside spots", color: "#4FC3F7", icon: "\u{1F3D6}\uFE0F", sortOrder: 600 },
    { name: "Island Trip", slug: "island-trip", description: "Island hopping and day trips", color: "#00ACC1", icon: "\u{1F3DD}\uFE0F", sortOrder: 601 },
    { name: "Park & Garden", slug: "park-garden", description: "Parks, gardens and green spaces", color: "#66BB6A", icon: "\u{1F333}", sortOrder: 602 },
    { name: "Pier & Marina", slug: "pier-marina", description: "Piers, marinas and harbors", color: "#5C6BC0", icon: "\u2693", sortOrder: 603 },

    // Group 7: Shopping & Markets (sortOrder 700-704)
    { name: "Shopping Mall", slug: "shopping-mall", description: "Shopping malls and department stores", color: "#e8a840", icon: "\u{1F3EC}", sortOrder: 700 },
    { name: "Day Market", slug: "market-day", description: "Day markets and bazaars", color: "#FFA726", icon: "\u{1F6CD}\uFE0F", sortOrder: 701 },
    { name: "Shopping Night Market", slug: "market-night", description: "Night markets and walking streets", color: "#FF8F00", icon: "\u{1F3EE}", sortOrder: 702 },
    { name: "Floating Market", slug: "floating-market", description: "Floating markets and boat markets", color: "#4DB6AC", icon: "\u{1F6F6}", sortOrder: 703 },
    { name: "Souvenir Shop", slug: "souvenir-shop", description: "Souvenir and gift shops", color: "#BA68C8", icon: "\u{1F381}", sortOrder: 704 },

    // Group 8: Wellness & Health (sortOrder 800-802)
    { name: "Spa & Massage", slug: "spa-massage", description: "Spas and traditional Thai massage", color: "#3db8a0", icon: "\u{1F486}", sortOrder: 800 },
    { name: "Wellness Center", slug: "wellness-center", description: "Wellness and health centers", color: "#4DB6AC", icon: "\u{1F9D8}", sortOrder: 801 },
    { name: "Beauty Salon", slug: "beauty-salon", description: "Hair salons and beauty parlors", color: "#F48FB1", icon: "\u{1F485}", sortOrder: 802 },

    // Group 9: Sports & Adventure (sortOrder 900-907)
    { name: "Karting", slug: "karting", description: "Go-kart tracks and racing", color: "#EF5350", icon: "\u{1F3CE}\uFE0F", sortOrder: 900 },
    { name: "Bowling", slug: "bowling", description: "Bowling alleys and lanes", color: "#7E57C2", icon: "\u{1F3B3}", sortOrder: 901 },
    { name: "Golf", slug: "golf", description: "Golf courses and driving ranges", color: "#4CAF50", icon: "\u26F3", sortOrder: 902 },
    { name: "Water Sports", slug: "water-sports", description: "Jet ski, parasailing and water fun", color: "#29B6F6", icon: "\u{1F3C4}", sortOrder: 903 },
    { name: "Zipline & Adventure", slug: "zipline-adventure", description: "Ziplines, adventure parks and outdoor fun", color: "#66BB6A", icon: "\u{1F9D7}", sortOrder: 904 },
    { name: "Fitness Gym", slug: "fitness-gym", description: "Gyms and fitness centers", color: "#78909C", icon: "\u{1F3CB}\uFE0F", sortOrder: 905 },
    { name: "Muay Thai Gym", slug: "muay-thai-gym", description: "Muay Thai training and combat sports", color: "#E53935", icon: "\u{1F94A}", sortOrder: 906 },
    { name: "Climbing & Skate", slug: "climbing-skate", description: "Climbing walls and skate parks", color: "#FF7043", icon: "\u{1F6F9}", sortOrder: 907 },

    // Group 10: Kids & Family (sortOrder 1000-1003)
    { name: "Kids Club", slug: "kids-club", description: "Kids clubs and children activities", color: "#FF8A65", icon: "\u{1F9D2}", sortOrder: 1000 },
    { name: "Family Activity", slug: "family-activity", description: "Family-friendly activities and outings", color: "#FFB74D", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", sortOrder: 1001 },
    { name: "Edutainment", slug: "edutainment", description: "Educational entertainment for kids", color: "#4FC3F7", icon: "\u{1F393}", sortOrder: 1002 },
    { name: "Animal Experience", slug: "animal-experience", description: "Animal encounters and wildlife experiences", color: "#81C784", icon: "\u{1F418}", sortOrder: 1003 },

    // Group 11: Transport (sortOrder 1100-1106)
    { name: "Bike Rental", slug: "bike-rental", description: "Motorbike and scooter rentals", color: "#FF7043", icon: "\u{1F6F5}", sortOrder: 1100 },
    { name: "Car Rental", slug: "car-rental", description: "Car rentals and chauffeur services", color: "#78909C", icon: "\u{1F697}", sortOrder: 1101 },
    { name: "Bicycle Rental", slug: "bicycle-rental", description: "Bicycle and e-bike rentals", color: "#66BB6A", icon: "\u{1F6B2}", sortOrder: 1102 },
    { name: "Airport Transfer", slug: "airport-transfer", description: "Airport shuttles and private transfers", color: "#42A5F5", icon: "\u2708\uFE0F", sortOrder: 1103 },
    { name: "Bus Station", slug: "bus-station", description: "Bus stations and terminals", color: "#8D6E63", icon: "\u{1F68C}", sortOrder: 1104 },
    { name: "Boat & Ferry", slug: "boat-ferry", description: "Boats, ferries and water transport", color: "#26C6DA", icon: "\u26F4\uFE0F", sortOrder: 1105 },
    { name: "Driving School", slug: "driving-school", description: "Driving schools and license services", color: "#FFA726", icon: "\u{1F6A6}", sortOrder: 1106 },

    // Group 12: Administration & Info (sortOrder 1200-1204)
    { name: "Immigration", slug: "immigration", description: "Immigration offices and visa services", color: "#5C6BC0", icon: "\u{1F6C2}", sortOrder: 1200 },
    { name: "Government Office", slug: "government-office", description: "Government offices and public services", color: "#78909C", icon: "\u{1F3DB}\uFE0F", sortOrder: 1201 },
    { name: "Embassy & Consulate", slug: "embassy-consulate", description: "Embassies and consulates", color: "#7E57C2", icon: "\u{1F3E2}", sortOrder: 1202 },
    { name: "School & Education", slug: "school-education", description: "Schools, universities and education", color: "#42A5F5", icon: "\u{1F3EB}", sortOrder: 1203 },
    { name: "Language School", slug: "language-school", description: "Thai and language learning schools", color: "#26A69A", icon: "\u{1F4DA}", sortOrder: 1204 },

    // Group 13: Post-only categories (Community only, sortOrder 1300-1305)
    { name: "General", slug: "general", description: "General discussions about Pattaya", color: "#78909C", icon: "\u{1F4AC}", sortOrder: 1300 },
    { name: "Events", slug: "events", description: "Upcoming events and things to do", color: "#42A5F5", icon: "\u{1F4C5}", sortOrder: 1301 },
    { name: "Promos & Deals", slug: "promo-deals", description: "Promotions, deals and discounts", color: "#e8a840", icon: "\u{1F3F7}\uFE0F", sortOrder: 1302 },
    { name: "Q&A", slug: "qna", description: "Questions and answers about Pattaya", color: "#7E57C2", icon: "\u2753", sortOrder: 1303 },
    { name: "Lost & Found", slug: "lost-found", description: "Lost and found items", color: "#EF5350", icon: "\u{1F50D}", sortOrder: 1304 },
    { name: "Site Admin", slug: "site-admin", description: "Site announcements and admin posts", color: "#78909C", icon: "\u{1F4CB}", sortOrder: 1305 },
  ];

  for (const cat of cats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, color: cat.color, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`Seeded ${cats.length} categories.`);

  // -- Admin user --
  const hashedPassword = await bcrypt.hash("bababobo66", 10);
  const admin = await prisma.profile.upsert({
    where: { email: "admin@pattayanicecity.com" },
    update: {},
    create: {
      email: "admin@pattayanicecity.com",
      username: "admin",
      displayName: "Admin",
      password: hashedPassword,
      isAdmin: true,
      isVerified: true,
    },
  });
  console.log("Admin user created:", admin.email);

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
