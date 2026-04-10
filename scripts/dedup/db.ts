// ─── SQLite database setup & migrations ─────────────────────────────────
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "..", "data", "dedup.sqlite");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS existing_spots (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL,
      name        TEXT NOT NULL,
      name_norm   TEXT NOT NULL,
      category    TEXT NOT NULL,
      address     TEXT,
      district    TEXT,
      phone       TEXT,
      phone_norm  TEXT,
      website     TEXT,
      website_norm TEXT,
      facebook    TEXT,
      instagram   TEXT,
      lat         REAL,
      lng         REAL
    );

    CREATE TABLE IF NOT EXISTS spot_candidates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      name_norm   TEXT NOT NULL,
      slug        TEXT NOT NULL,
      category    TEXT NOT NULL,
      address     TEXT,
      neighborhood TEXT,
      phone       TEXT,
      phone_norm  TEXT,
      website     TEXT,
      website_norm TEXT,
      instagram   TEXT,
      facebook    TEXT,
      lat         REAL,
      lng         REAL,
      source      TEXT NOT NULL,
      source_url  TEXT,
      is_active   INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      added_at    TEXT NOT NULL,
      -- dedup results
      classification TEXT,
      dedup_score REAL,
      best_match_id TEXT,
      best_match_name TEXT,
      dedup_reason TEXT,
      dedup_signals TEXT,  -- JSON
      UNIQUE(name_norm, category)
    );

    CREATE INDEX IF NOT EXISTS idx_existing_category ON existing_spots(category);
    CREATE INDEX IF NOT EXISTS idx_existing_name_norm ON existing_spots(name_norm);
    CREATE INDEX IF NOT EXISTS idx_existing_phone_norm ON existing_spots(phone_norm);
    CREATE INDEX IF NOT EXISTS idx_candidates_category ON spot_candidates(category);
    CREATE INDEX IF NOT EXISTS idx_candidates_classification ON spot_candidates(classification);
  `);
}

export function resetDb() {
  const db = getDb();
  db.exec("DELETE FROM spot_candidates");
  db.exec("DELETE FROM existing_spots");
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
