#!/usr/bin/env npx tsx
// ─── Script 5: Coverage report ──────────────────────────────────────────
import { getDb, closeDb } from "./db";
import { CATEGORIES } from "./types";

function run() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  COVERAGE REPORT                           ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  const db = getDb();

  const existingCounts = db.prepare("SELECT category, COUNT(*) as cnt FROM existing_spots GROUP BY category").all() as any[];
  const existingMap: Record<string, number> = {};
  for (const e of existingCounts) existingMap[e.category] = e.cnt;

  const candidateStats = db.prepare(`
    SELECT category, classification, COUNT(*) as cnt
    FROM spot_candidates
    GROUP BY category, classification
  `).all() as any[];
  const candMap: Record<string, Record<string, number>> = {};
  for (const row of candidateStats) {
    if (!candMap[row.category]) candMap[row.category] = {};
    candMap[row.category][row.classification] = row.cnt;
  }

  // Needs_review details
  const reviewItems = db.prepare(`
    SELECT name, category, dedup_score, best_match_name, dedup_reason
    FROM spot_candidates
    WHERE classification = 'needs_review'
    ORDER BY category, dedup_score DESC
  `).all() as any[];

  console.log("📊 EXISTING VENUE COVERAGE:");
  console.log("─".repeat(70));
  console.log("Category".padEnd(22) + "Current".padStart(8) + "  New".padStart(6) + "  Dupes".padStart(8) + "  Review".padStart(8) + "  After".padStart(8));
  console.log("─".repeat(70));

  let totalExisting = 0;
  let totalNew = 0;

  for (const cat of CATEGORIES) {
    const existing = existingMap[cat] || 0;
    const stats = candMap[cat] || {};
    const okToAdd = stats["ok_to_add"] || 0;
    const dupes = stats["duplicate"] || 0;
    const review = stats["needs_review"] || 0;

    totalExisting += existing;
    totalNew += okToAdd;

    const after = existing + okToAdd;
    const bar = "█".repeat(Math.min(Math.round(existing / 3), 20));
    const newBar = "░".repeat(Math.min(Math.round(okToAdd / 3), 10));

    console.log(
      cat.padEnd(22) +
      String(existing).padStart(8) +
      String(okToAdd > 0 ? `+${okToAdd}` : "-").padStart(6) +
      String(dupes).padStart(8) +
      String(review).padStart(8) +
      String(after).padStart(8) +
      `  ${bar}${newBar}`
    );
  }

  console.log("─".repeat(70));
  console.log(
    "TOTAL".padEnd(22) +
    String(totalExisting).padStart(8) +
    String(totalNew > 0 ? `+${totalNew}` : "-").padStart(6) +
    "".padStart(16) +
    String(totalExisting + totalNew).padStart(8)
  );

  // Show needs_review items
  if (reviewItems.length > 0) {
    console.log("\n\n🟡 NEEDS HUMAN REVIEW:");
    console.log("─".repeat(70));
    for (const item of reviewItems) {
      console.log(`  ${item.category.padEnd(18)} ${item.name.padEnd(30)} score=${item.dedup_score.toFixed(3)}`);
      console.log(`  ${"".padEnd(18)} → might be "${item.best_match_name}"`);
      console.log();
    }
  }

  closeDb();
}

run();
