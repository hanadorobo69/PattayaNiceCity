#!/usr/bin/env npx tsx
// ─── Script 1: Import existing venues into SQLite ──────────────────────
import path from "path";
import fs from "fs";
import { getDb, closeDb, resetDb } from "./db";
import { normalizeName, normalizePhone, normalizeWebsite } from "./normalize";
import type { ExistingVenue } from "./types";

const JSON_PATH = path.join(__dirname, "..", "..", "data", "existing-venues.json");

function run() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  IMPORT EXISTING VENUES → SQLite          ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ File not found: ${JSON_PATH}`);
    console.log("   Export from production first:");
    console.log('   ssh pattaya "cd ~/PattayaViceCity && npx tsx scripts/export-venues.ts"');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const venues: any[] = Array.isArray(raw) ? raw : (raw.venues || raw.spots || []);

  console.log(`📁 Loaded ${venues.length} venues from JSON\n`);

  const db = getDb();

  // Clear existing data
  db.exec("DELETE FROM existing_spots");

  const insert = db.prepare(`
    INSERT OR REPLACE INTO existing_spots
    (id, slug, name, name_norm, category, address, district, phone, phone_norm, website, website_norm, facebook, instagram, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const v of venues) {
      const catSlug = typeof v.category === "object" ? v.category.slug : (v.categorySlug || v.category);
      insert.run(
        v.id,
        v.slug,
        v.name,
        normalizeName(v.name),
        catSlug,
        v.address || null,
        v.district || null,
        v.phone || null,
        normalizePhone(v.phone),
        v.website || null,
        normalizeWebsite(v.website),
        v.facebook || null,
        v.instagram || null,
        v.lat || null,
        v.lng || null,
      );
    }
  });
  tx();

  // Report
  const cats = db.prepare("SELECT category, COUNT(*) as cnt FROM existing_spots GROUP BY category ORDER BY cnt DESC").all() as any[];
  console.log("📊 Imported by category:");
  let total = 0;
  for (const c of cats) {
    console.log(`   ${c.category.padEnd(20)} ${c.cnt}`);
    total += c.cnt;
  }
  console.log(`\n✅ Total: ${total} venues imported into SQLite`);

  closeDb();
}

run();
