const fs = require('fs');
const d = fs.readFileSync('new_spots_to_add.txt', 'utf8');

// Split by top-level JSON objects
const objects = [];
let depth = 0, start = 0, inStr = false, esc = false;
for (let i = 0; i < d.length; i++) {
  const c = d[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (c === '{') { if (depth === 0) start = i; depth++; }
  if (c === '}') { depth--; if (depth === 0) objects.push(d.slice(start, i + 1)); }
}

console.log('Found', objects.length, 'JSON blocks');
let totalSpots = 0;
const allSpots = [];
for (const o of objects) {
  try {
    const j = JSON.parse(o);
    const spots = j.spots || [];
    totalSpots += spots.length;
    console.log(' -', j.category + ':', spots.length, 'spots');
    for (const s of spots) {
      allSpots.push(s);
    }
  } catch(e) { console.log('Parse err:', e.message.slice(0, 80)); }
}
console.log('Total spots:', totalSpots);

// Write combined JSON for the import script
fs.writeFileSync('new_spots_combined.json', JSON.stringify(allSpots, null, 2));
console.log('Written to new_spots_combined.json');
