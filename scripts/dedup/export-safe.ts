#!/usr/bin/env npx tsx
// ─── Script 4: Export safe additions to JSON ────────────────────────────
import path from "path";
import fs from "fs";
import { getDb, closeDb } from "./db";
import type { FinalReport, CategoryReport, SpotCandidate, Category } from "./types";
import { CATEGORIES } from "./types";

const OUTPUT_PATH = path.join(__dirname, "..", "..", "data", "new_spots_to_add.json");
const DRY_RUN = process.env.DRY_RUN !== "false";

function run() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  EXPORT SAFE ADDITIONS                     ║");
  console.log(`║  Mode: ${DRY_RUN ? "DRY RUN (set DRY_RUN=false to export)" : "LIVE EXPORT"}  ║`);
  console.log("╚═══════════════════════════════════════════╝\n");

  const db = getDb();

  // Verify scoring has been done
  const unscored = db.prepare("SELECT COUNT(*) as cnt FROM spot_candidates WHERE classification IS NULL").get() as any;
  if (unscored.cnt > 0) {
    console.error(`❌ ${unscored.cnt} candidates haven't been scored. Run dedup:score first.`);
    closeDb();
    process.exit(1);
  }

  // Get approved spots
  const approved = db.prepare(`
    SELECT * FROM spot_candidates
    WHERE classification = 'ok_to_add'
    ORDER BY category, name
  `).all() as any[];

  // Get all stats
  const allCandidates = db.prepare(`
    SELECT category, classification, COUNT(*) as cnt
    FROM spot_candidates
    GROUP BY category, classification
  `).all() as any[];

  const existingCounts = db.prepare(`
    SELECT category, COUNT(*) as cnt FROM existing_spots GROUP BY category
  `).all() as any[];
  const existingMap: Record<string, number> = {};
  for (const e of existingCounts) existingMap[e.category] = e.cnt;

  // Build category reports
  const catMap: Record<string, CategoryReport> = {};
  for (const cat of CATEGORIES) {
    catMap[cat] = {
      category: cat,
      existingCount: existingMap[cat] || 0,
      candidatesFound: 0,
      duplicates: 0,
      needsReview: 0,
      approved: 0,
      approvedNames: [],
    };
  }

  for (const row of allCandidates) {
    const report = catMap[row.category];
    if (!report) continue;
    report.candidatesFound += row.cnt;
    if (row.classification === "duplicate") report.duplicates += row.cnt;
    if (row.classification === "needs_review") report.needsReview += row.cnt;
    if (row.classification === "ok_to_add") report.approved += row.cnt;
  }

  // Build spots array
  const spots: SpotCandidate[] = approved.map((r: any) => {
    const cat = r.category as Category;
    if (catMap[cat]) catMap[cat].approvedNames.push(r.name);
    return {
      name: r.name,
      slug: r.slug,
      category: cat,
      address: r.address,
      neighborhood: r.neighborhood,
      phone: r.phone,
      website: r.website,
      instagram: r.instagram,
      facebook: r.facebook,
      lat: r.lat,
      lng: r.lng,
      source: r.source,
      sourceUrl: r.source_url,
      isActive: true,
      isVerified: false,
      addedAt: r.added_at,
    };
  });

  // Build final report
  const report: FinalReport = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    summary: {
      totalExisting: Object.values(existingMap).reduce((a, b) => a + b, 0),
      totalCandidates: allCandidates.reduce((a: number, b: any) => a + b.cnt, 0),
      totalApproved: spots.length,
      totalDuplicates: allCandidates.filter((r: any) => r.classification === "duplicate").reduce((a: number, b: any) => a + b.cnt, 0),
      totalNeedsReview: allCandidates.filter((r: any) => r.classification === "needs_review").reduce((a: number, b: any) => a + b.cnt, 0),
    },
    byCategory: Object.values(catMap).filter(c => c.existingCount > 0 || c.candidatesFound > 0),
    spots,
  };

  // Print report
  console.log("📊 REPORT BY CATEGORY:");
  console.log("─".repeat(80));
  console.log("Category".padEnd(22) + "Existing".padStart(10) + "Found".padStart(8) + "Dupes".padStart(8) + "Review".padStart(8) + "✅ New".padStart(8));
  console.log("─".repeat(80));

  for (const c of report.byCategory) {
    console.log(
      c.category.padEnd(22) +
      String(c.existingCount).padStart(10) +
      String(c.candidatesFound).padStart(8) +
      String(c.duplicates).padStart(8) +
      String(c.needsReview).padStart(8) +
      String(c.approved).padStart(8)
    );
    if (c.approvedNames.length > 0) {
      for (const name of c.approvedNames) {
        console.log(`   └─ 🟢 ${name}`);
      }
    }
  }

  console.log("─".repeat(80));
  console.log(
    "TOTAL".padEnd(22) +
    String(report.summary.totalExisting).padStart(10) +
    String(report.summary.totalCandidates).padStart(8) +
    String(report.summary.totalDuplicates).padStart(8) +
    String(report.summary.totalNeedsReview).padStart(8) +
    String(report.summary.totalApproved).padStart(8)
  );

  // Write output
  if (!DRY_RUN || spots.length > 0) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n📄 Written to: ${OUTPUT_PATH}`);
    console.log(`   ${spots.length} spots ready for import`);
  }

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN mode — no auto-import. Review the JSON and run:");
    console.log("   DRY_RUN=false npx tsx scripts/dedup/export-safe.ts");
  }

  closeDb();
}

run();
