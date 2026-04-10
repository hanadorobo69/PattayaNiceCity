"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import type { ActionResult } from "@/types";

export async function toggleVenueFavorite(
  venueId: string,
  venueSlug: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in" };

  const existing = await prisma.venueFavorite.findUnique({
    where: { userId_venueId: { userId, venueId } },
  });

  if (existing) {
    await prisma.venueFavorite.delete({
      where: { id: existing.id },
    });
    revalidatePath(`/places/${venueSlug}`);
    return { success: true, data: { favorited: false } };
  }

  await prisma.venueFavorite.create({
    data: { userId, venueId },
  });
  revalidatePath(`/places/${venueSlug}`);
  return { success: true, data: { favorited: true } };
}

export async function isVenueFavorited(venueId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const fav = await prisma.venueFavorite.findUnique({
    where: { userId_venueId: { userId, venueId } },
  });
  return !!fav;
}

export async function getUserVenueFavorites(userId: string) {
  return prisma.venueFavorite.findMany({
    where: { userId },
    include: {
      venue: {
        include: {
          category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
          _count: { select: { venueRatings: true, posts: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
