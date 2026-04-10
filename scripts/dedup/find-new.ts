#!/usr/bin/env npx tsx
// ─── Script 2: Load candidate spots into SQLite ────────────────────────
// Reads from data/candidates/*.json (one file per category or one big file)
// Format: array of { name, category, address?, phone?, website?, ... }
import path from "path";
import fs from "fs";
import { getDb, closeDb } from "./db";
import { normalizeName, normalizePhone, normalizeWebsite, makeSlug } from "./normalize";
import type { Category, CATEGORIES } from "./types";

const CANDIDATES_DIR = path.join(__dirname, "..", "..", "data", "candidates");
const CANDIDATES_FILE = path.join(__dirname, "..", "..", "data", "candidates.json");
const MAX_PER_CATEGORY = 15;

function loadCandidates(): any[] {
  const all: any[] = [];

  // Option 1: Single file data/candidates.json
  if (fs.existsSync(CANDIDATES_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf-8"));
    const spots = Array.isArray(raw) ? raw : (raw.spots || raw.candidates || []);
    all.push(...spots);
    console.log(`📁 Loaded ${spots.length} candidates from candidates.json`);
  }

  // Option 2: Per-category files in data/candidates/
  if (fs.existsSync(CANDIDATES_DIR)) {
    for (const file of fs.readdirSync(CANDIDATES_DIR).filter(f => f.endsWith(".json"))) {
      const raw = JSON.parse(fs.readFileSync(path.join(CANDIDATES_DIR, file), "utf-8"));
      const spots = Array.isArray(raw) ? raw : (raw.spots || raw.candidates || []);
      all.push(...spots);
      console.log(`📁 Loaded ${spots.length} candidates from candidates/${file}`);
    }
  }

  if (all.length === 0) {
    console.log("⚠️  No candidates found. Place files in:");
    console.log("   - data/candidates.json");
    console.log("   - data/candidates/<category>.json");
  }

  return all;
}

function run() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  LOAD NEW SPOT CANDIDATES → SQLite        ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  const candidates = loadCandidates();
  if (candidates.length === 0) return;

  const db = getDb();

  // Clear old candidates
  db.exec("DELETE FROM spot_candidates");

  const insert = db.prepare(`
    INSERT OR IGNORE INTO spot_candidates
    (name, name_norm, slug, category, address, neighborhood, phone, phone_norm, website, website_norm, instagram, facebook, lat, lng, source, source_url, is_active, is_verified, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
  `);

  // Track per-category counts
  const counts: Record<string, number> = {};
  let inserted = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    for (const c of candidates) {
      const cat = c.category || c.categorySlug;
      if (!cat) { skipped++; continue; }

      counts[cat] = (counts[cat] || 0) + 1;
      if (counts[cat] > MAX_PER_CATEGORY) {
        skipped++;
        continue;
      }

      const nameNorm = normalizeName(c.name);
      if (!nameNorm || nameNorm.length < 2) { skipped++; continue; }

      try {
        insert.run(
          c.name,
          nameNorm,
          c.slug || makeSlug(c.name),
          cat,
          c.address || null,
          c.neighborhood || c.district || null,
          c.phone || null,
          normalizePhone(c.phone),
          c.website || null,
          normalizeWebsite(c.website),
          c.instagram || null,
          c.facebook || null,
          c.lat || null,
          c.lng || null,
          c.source || "web_research_2026",
          c.sourceUrl || c.source_url || null,
          new Date().toISOString(),
        );
        inserted++;
      } catch {
        skipped++; // duplicate name+category
      }
    }
  });
  tx();

  // Report
  const catCounts = db.prepare("SELECT category, COUNT(*) as cnt FROM spot_candidates GROUP BY category ORDER BY cnt DESC").all() as any[];
  console.log(`\n📊 Loaded candidates by category:`);
  for (const c of catCounts) {
    console.log(`   ${c.category.padEnd(20)} ${c.cnt}`);
  }
  console.log(`\n✅ Inserted: ${inserted} | Skipped: ${skipped}`);

  closeDb();
}

run();
