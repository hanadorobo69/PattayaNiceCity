/**
 * DRY RUN — shows proposed district changes without applying them.
 * Run: node scripts/update-venues-dryrun.js
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const VALID_DISTRICTS = ["walking-street", "soi-6", "tree-town", "pattaya-beach", "jomtien", "pratumnak", "n-a"];

function assignDistrict(lat, lng, address) {
  const addr = (address || "").toLowerCase();

  // 1. Walking Street
  if (addr.includes("walking st") || addr.includes("walking street")) return "walking-street";
  if (addr.includes("soi diamond")) return "walking-street";
  if (addr.includes("soi soho")) return "walking-street";
  if (lat >= 12.9240 && lat <= 12.9315 && lng >= 100.8690 && lng <= 100.8780) return "walking-street";

  // 2. Soi 6
  if (addr.includes("soi 6,") || addr.includes("soi 6 ") || addr.includes("pattaya 6")) return "soi-6";
  if (lat >= 12.9360 && lat <= 12.9410 && lng >= 100.8730 && lng <= 100.8890) return "soi-6";

  // 3. Pattaya Beach — along Beach Rd, within ~200m of shore, north of Walking Street
  if (addr.includes("beach rd") || addr.includes("beach road")) {
    if (lat > 12.930) return "pattaya-beach";
  }
  if (lat > 12.9310 && lat < 12.9560 && lng >= 100.8680 && lng <= 100.8830) {
    if (!(lat >= 12.9360 && lat <= 12.9410)) return "pattaya-beach";
  }

  // 4. Tree Town / Soi Buakhao / LK Metro
  if (addr.includes("buakhao") || addr.includes("soi buakhao") || addr.includes("bua khao")) return "tree-town";
  if (addr.includes("lk metro") || addr.includes("l k metro")) return "tree-town";
  if (addr.includes("bong koch") || addr.includes("bongkot") || addr.includes("bongkoch")) return "tree-town";
  if (addr.includes("chaiyapoon") || addr.includes("chayapoon") || addr.includes("chalermphrakiat")) return "tree-town";
  if (addr.includes("soi diana")) return "tree-town";
  if (addr.includes("soi honey")) return "tree-town";
  if (lat >= 12.9230 && lat <= 12.9370 && lng > 100.8780 && lng <= 100.8970) return "tree-town";
  if (lat > 12.9370 && lat <= 12.9470 && lng > 100.8830 && lng <= 100.8970) return "tree-town";

  // 5. Jomtien (check BEFORE Pratumnak — Thappraya Rd crosses both zones)
  if (addr.includes("jomtien") || addr.includes("chomtian") || addr.includes("chaiyapruek") || addr.includes("chaiyaphruek")) return "jomtien";
  if (addr.includes("จอมเทียน")) return "jomtien";
  if (lat < 12.9050) return "jomtien";
  if (lat >= 12.9050 && lat < 12.9150 && lng > 100.8650) return "jomtien";

  // 6. Pratumnak
  if (addr.includes("pratumnak") || addr.includes("pratamnak") || addr.includes("phra tamnak")) return "pratumnak";
  if (addr.includes("thappraya") && lat >= 12.905 && lat < 12.925) return "pratumnak";
  if (lat >= 12.9050 && lat < 12.9250 && lng >= 100.8550 && lng < 100.8780) return "pratumnak";

  // 7. N/A
  return "n-a";
}

async function main() {
  const venues = await p.venue.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, district: true, lat: true, lng: true, hours: true, address: true },
    orderBy: { district: "asc" },
  });

  let changes = 0;
  let noHours = 0;
  const byNewDistrict = {};

  for (const v of venues) {
    const newDistrict = v.lat && v.lng ? assignDistrict(v.lat, v.lng, v.address) : "n-a";
    const current = v.district || "NULL";
    const hasHours = v.hours && v.hours !== "{}" && v.hours !== "null";

    if (!hasHours) noHours++;

    if (!byNewDistrict[newDistrict]) byNewDistrict[newDistrict] = 0;
    byNewDistrict[newDistrict]++;

    if (newDistrict !== v.district) {
      console.log(`${v.slug.padEnd(55)} ${current.padEnd(20)} → ${newDistrict.padEnd(20)} (${v.lat},${v.lng})`);
      changes++;
    }
  }

  console.log(`\n══ Summary ══`);
  console.log(`Total venues: ${venues.length}`);
  console.log(`District changes needed: ${changes}`);
  console.log(`Missing hours: ${noHours}`);
  console.log(`\nNew distribution:`, JSON.stringify(byNewDistrict, null, 2));

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
