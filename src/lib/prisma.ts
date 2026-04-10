import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Safe author fields to include in API responses - never leak password, email, googleId */
export const safeAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  karma: true,
  isAdmin: true,
  isVerified: true,
} as const;

/** Sanitize error message for client - never expose internal DB/system details */
export function safeError(action: string, error: unknown): string {
  if (process.env.NODE_ENV !== "production") {
    return `${action}: ${error instanceof Error ? error.message : String(error)}`;
  }
  console.error(`${action}:`, error);
  return action;
}
