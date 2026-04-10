// Database-agnostic SQL helpers
// Detects SQLite vs PostgreSQL from DATABASE_URL and adapts queries

const isPostgres = (process.env.DATABASE_URL ?? "").startsWith("postgresql")

/**
 * Build placeholder string for IN clauses
 * SQLite: ?, ?, ?
 * PostgreSQL: $1, $2, $3
 */
export function placeholders(count: number, offset = 0): string {
  if (isPostgres) {
    return Array.from({ length: count }, (_, i) => `$${i + 1 + offset}`).join(", ")
  }
  return Array(count).fill("?").join(", ")
}

/**
 * Single placeholder
 * SQLite: ?
 * PostgreSQL: $N
 */
export function param(index: number): string {
  return isPostgres ? `$${index}` : "?"
}

/**
 * Quote identifier (column/table name)
 * PostgreSQL needs double quotes for camelCase, SQLite doesn't care
 */
export function qi(name: string): string {
  return isPostgres ? `"${name}"` : name
}

/**
 * Extract hour from a timestamp column
 * SQLite: CAST(strftime('%H', col) AS INTEGER)
 * PostgreSQL: EXTRACT(HOUR FROM "col")::integer
 */
export function extractHour(col: string): string {
  return isPostgres
    ? `EXTRACT(HOUR FROM "${col}")::integer`
    : `CAST(strftime('%H', ${col}) AS INTEGER)`
}

/**
 * Timestamp cast for parameter binding
 * PostgreSQL needs ::timestamp, SQLite doesn't
 */
export function timestampParam(index: number): string {
  return isPostgres ? `$${index}::timestamp` : "?"
}
