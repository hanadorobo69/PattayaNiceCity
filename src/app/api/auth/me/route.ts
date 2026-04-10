import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ user: null });

    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: { id: profile.id, email: profile.email, profile },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
