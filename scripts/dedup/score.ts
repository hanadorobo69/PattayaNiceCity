#!/usr/bin/env npx tsx
// ─── Script 3: Run deduplication scoring ────────────────────────────────
import { getDb, closeDb } from "./db";
import { scoreCandidate } from "./similarity";
import type { ExistingVenue, SpotCandidate } from "./types";

function dbRowToExisting(row: any): ExistingVenue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    district: row.district,
    phone: row.phone,
    website: row.website,
    facebook: row.facebook,
    instagram: row.instagram,
    lat: row.lat,
    lng: row.lng,
    categorySlug: row.category,
  };
}

function dbRowToCandidate(row: any): SpotCandidate {
  return {
    name: row.name,
    slug: row.slug,
    category: row.category,
    address: row.address,
    neighborhood: row.neighborhood,
    phone: row.phone,
    website: row.website,
    instagram: row.instagram,
    facebook: row.facebook,
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    sourceUrl: row.source_url,
    isActive: !!row.is_active,
    isVerified: !!row.is_verified,
    addedAt: row.added_at,
  };
}

function run() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  DEDUPLICATION SCORING                     ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  const db = getDb();

  // Load all existing venues
  const existingRows = db.prepare("SELECT * FROM existing_spots").all();
  const existingVenues = existingRows.map(dbRowToExisting);
  console.log(`📦 ${existingVenues.length} existing venues loaded\n`);

  // Load candidates
  const candidateRows = db.prepare("SELECT * FROM spot_candidates").all() as any[];
  console.log(`🎯 ${candidateRows.length} candidates to score\n`);

  if (candidateRows.length === 0) {
    console.log("⚠️  No candidates. Run find-new first.");
    closeDb();
    return;
  }

  // Score each candidate
  const updateStmt = db.prepare(`
    UPDATE spot_candidates SET
      classification = ?,
      dedup_score = ?,
      best_match_id = ?,
      best_match_name = ?,
      dedup_reason = ?,
      dedup_signals = ?
    WHERE id = ?
  `);

  let stats = { duplicate: 0, needs_review: 0, ok_to_add: 0 };

  const tx = db.transaction(() => {
    for (const row of candidateRows) {
      const candidate = dbRowToCandidate(row);
      const result = scoreCandidate(candidate, existingVenues);

      updateStmt.run(
        result.classification,
        result.score,
        result.bestMatch?.id || null,
        result.bestMatch?.name || null,
        result.reason,
        JSON.stringify(result.signals),
        row.id,
      );

      stats[result.classification]++;

      // Log decision
      const icon = result.classification === "duplicate" ? "🔴"
        : result.classification === "needs_review" ? "🟡" : "🟢";
      console.log(`${icon} ${candidate.name.padEnd(35)} → ${result.classification.padEnd(14)} (${result.score.toFixed(3)}) ${result.bestMatch ? `≈ ${result.bestMatch.name}` : ""}`);
    }
  });
  tx();

  console.log("\n" + "─".repeat(60));
  console.log(`📊 Results:`);
  console.log(`   🟢 OK to add:     ${stats.ok_to_add}`);
  console.log(`   🟡 Needs review:  ${stats.needs_review}`);
  console.log(`   🔴 Duplicate:     ${stats.duplicate}`);
  console.log(`   Total:            ${candidateRows.length}`);

  closeDb();
}

run();
