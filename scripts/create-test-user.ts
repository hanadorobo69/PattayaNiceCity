import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.profile.findFirst({
    where: { OR: [{ username: "test" }, { email: "test@pvc.local" }] },
  });
  if (existing) {
    console.log("Test user already exists:", existing.username, existing.email);
    return;
  }

  const hashed = await bcrypt.hash("test", 12);

  const user = await (prisma.profile as any).create({
    data: {
      username: "test",
      email: "test@pvc.local",
      password: hashed,
      displayName: "Test User",
      isAdmin: false,
    },
  });

  console.log("Created test user:", user.id, user.username, user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
