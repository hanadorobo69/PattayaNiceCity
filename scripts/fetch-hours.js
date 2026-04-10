/**
 * Fetch missing hours from Google Places API for venues that don't have them.
 * Uses Autocomplete + Details API (same as the venue form).
 * Run on VPS: node scripts/fetch-hours.js
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY;

async function searchPlace(name) {
  const input = `${name} Pattaya`;
  const res = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["th"],
      locationBias: {
        circle: { center: { latitude: 12.93, longitude: 100.88 }, radius: 10000 },
      },
    }),
  });
  const data = await res.json();
  if (data.suggestions && data.suggestions.length > 0) {
    const placeId = data.suggestions[0].placePrediction?.placeId;
    return placeId || null;
  }
  return null;
}

async function fetchDetails(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "regularOpeningHours",
    },
  });
  const data = await res.json();
  if (data.regularOpeningHours?.periods?.length) {
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = {};
    for (const d of dayMap) hours[d] = { open: "00:00", close: "00:00", closed: true };
    for (const period of data.regularOpeningHours.periods) {
      const openDay = dayMap[period.open?.day ?? 0];
      if (openDay && period.open) {
        const oh = String(period.open.hour ?? 0).padStart(2, "0");
        const om = String(period.open.minute ?? 0).padStart(2, "0");
        const ch = String(period.close?.hour ?? 0).padStart(2, "0");
        const cm = String(period.close?.minute ?? 0).padStart(2, "0");
        hours[openDay] = { open: `${oh}:${om}`, close: `${ch}:${cm}`, closed: false };
      }
    }
    return JSON.stringify(hours);
  }
  return null;
}

async function main() {
  if (!GOOGLE_KEY) { console.error("No GOOGLE_MAPS_KEY"); process.exit(1); }

  const venues = await p.venue.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, hours: true },
    orderBy: { name: "asc" },
  });

  const noHours = venues.filter(v => !v.hours || v.hours === "{}" || v.hours === "null");
  console.log(`Found ${noHours.length} venues without hours.\n`);

  let fetched = 0, notFound = 0;

  for (const v of noHours) {
    console.log(`⏳ ${v.name}...`);
    const placeId = await searchPlace(v.name);
    if (placeId) {
      console.log(`  Found place: ${placeId}`);
      const hours = await fetchDetails(placeId);
      if (hours) {
        await p.venue.update({ where: { id: v.id }, data: { hours } });
        console.log(`  ✅ Hours updated`);
        fetched++;
      } else {
        console.log(`  ⚠️  No hours in Google`);
        notFound++;
      }
    } else {
      console.log(`  ❌ Not found on Google`);
      notFound++;
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n═══ Summary ═══`);
  console.log(`Hours fetched: ${fetched}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Still missing: ${noHours.length - fetched}`);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
