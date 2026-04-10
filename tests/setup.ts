/**
 * Test database setup — uses a SEPARATE PostgreSQL database (pattayavicecity_test)
 * so tests never touch the production database.
 *
 * Flow:
 * 1. Create the test database (DROP + CREATE)
 * 2. Push the Prisma schema to it
 * 3. Seed categories + test users
 * 4. Run tests
 * 5. Drop the test database
 */

import { execSync } from "child_process"
import { PrismaClient } from "@prisma/client"

// Parse the production DATABASE_URL to build a test one
const PROD_URL = process.env.DATABASE_URL || "postgresql://postgres:admin@localhost:5432/pattayavicecity"
const TEST_DB_NAME = "pattayavicecity_test"
const TEST_DB_URL = PROD_URL.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`)

// Connection to the default "postgres" database for CREATE/DROP operations
const ADMIN_URL = PROD_URL.replace(/\/[^/?]+(\?|$)/, `/postgres$1`)

let prisma: PrismaClient

/** All spot categories from seed.ts */
const SPOT_CATEGORIES = [
  { name: "Bar", slug: "bar", color: "#F59E0B", icon: "🍺" },
  { name: "BJ Bar", slug: "bj-bar", color: "#EC4899", icon: "💋" },
  { name: "Gentleman's Club", slug: "gentlemans-club", color: "#8B5CF6", icon: "🎭" },
  { name: "Massage", slug: "massage", color: "#10B981", icon: "💆" },
  { name: "GoGo Club", slug: "gogo-bar", color: "#EF4444", icon: "💃" },
  { name: "Russian GoGo", slug: "russian-gogo", color: "#3B82F6", icon: "🪆" },
  { name: "Club", slug: "club", color: "#6366F1", icon: "🎧" },
  { name: "KTV", slug: "ktv", color: "#F472B6", icon: "🎤" },
  { name: "Short-Time Hotel", slug: "short-time-hotel", color: "#F59E0B", icon: "🏩" },
  { name: "Ladyboy Bar", slug: "ladyboy-bar", color: "#A855F7", icon: "✨" },
  { name: "Ladyboy GoGo", slug: "ladyboy-gogo", color: "#C084FC", icon: "✨" },
  { name: "Ladyboy Club", slug: "ladyboy-club", color: "#D946EF", icon: "✨" },
  { name: "Ladyboy Massage", slug: "ladyboy-massage", color: "#E879F9", icon: "✨" },
  { name: "Gay Bar", slug: "gay-bar", color: "#F43F5E", icon: "🏳️‍🌈" },
  { name: "Gay GoGo", slug: "gay-gogo", color: "#FB7185", icon: "🏳️‍🌈" },
  { name: "Gay Club", slug: "gay-club", color: "#FDA4AF", icon: "🏳️‍🌈" },
  { name: "Gay Massage", slug: "gay-massage", color: "#FF6B8A", icon: "🏳️‍🌈" },
  { name: "General", slug: "general", color: "#64748B", icon: "💬" },
  { name: "Events", slug: "events", color: "#0EA5E9", icon: "📅" },
  { name: "Location Bike/Car", slug: "location-bike-car", color: "#F97316", icon: "🛵" },
  { name: "Administration", slug: "administration", color: "#78716C", icon: "📋" },
  { name: "Coffee Shop", slug: "coffee-shop", color: "#22C55E", icon: "🌿" },
  { name: "Freelance", slug: "freelance", color: "#FF2D95", icon: "💃" },
  { name: "Ladyboy Freelance", slug: "ladyboy-freelance", color: "#A855F7", icon: "✨" },
  { name: "Gay Freelance", slug: "gay-freelance", color: "#3B82F6", icon: "🏳️‍🌈" },
]

export async function setupTestDb() {
  // 1. Drop + Create test database via admin connection
  const adminPrisma = new PrismaClient({ datasourceUrl: ADMIN_URL })
  await adminPrisma.$connect()
  // Terminate existing connections to test DB
  await adminPrisma.$executeRawUnsafe(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()`
  ).catch(() => {})
  await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`).catch(() => {})
  await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB_NAME}"`)
  await adminPrisma.$disconnect()

  // 2. Push Prisma schema to test DB
  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  })

  // 3. Connect to test DB
  prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL })
  await prisma.$connect()

  // 4. Seed categories
  for (const cat of SPOT_CATEGORIES) {
    await prisma.category.create({ data: cat })
  }

  // 5. Seed test users
  await prisma.profile.create({
    data: {
      id: "test-admin-id",
      username: "testadmin",
      email: "admin@test.com",
      password: "hashed-not-used",
      displayName: "Test Admin",
      isAdmin: true,
    },
  })

  await prisma.profile.create({
    data: {
      id: "test-user-id",
      username: "testuser",
      email: "user@test.com",
      password: "hashed-not-used",
      displayName: "Test User",
    },
  })

  return prisma
}

export async function teardownTestDb() {
  if (prisma) await prisma.$disconnect()

  // Drop the test database
  const adminPrisma = new PrismaClient({ datasourceUrl: ADMIN_URL })
  await adminPrisma.$connect()
  await adminPrisma.$executeRawUnsafe(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()`
  ).catch(() => {})
  await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`)
  await adminPrisma.$disconnect()
}

export function getTestPrisma() {
  return prisma
}

export { SPOT_CATEGORIES }
