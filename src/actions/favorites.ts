"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import type { ActionResult, PostWithDetails } from "@/types";

export async function toggleFavorite(postId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in to save" };

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { success: false, error: "Post not found" };

  try {
    const existing = await prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_postId: { userId, postId } } });
      revalidatePath("/community");
      revalidatePath(`/post/${post.slug}`);
      return { success: true, data: { favorited: false } };
    } else {
      await prisma.favorite.create({ data: { userId, postId } });
      revalidatePath("/community");
      revalidatePath(`/post/${post.slug}`);
      return { success: true, data: { favorited: true } };
    }
  } catch (error) {
    console.error("toggleFavorite error:", error);
    return { success: false, error: "Failed to save" };
  }
}

export async function getUserFavorites(userId: string): Promise<ActionResult<PostWithDetails[]>> {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
            category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
            _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: favorites.map((f) => f.post) };
  } catch (error) {
    console.error("getUserFavorites error:", error);
    return { success: false, error: "Failed to load favorites" };
  }
}

export async function isPostFavorited(postId: string): Promise<ActionResult<boolean>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: true, data: false };

  try {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return { success: true, data: !!favorite };
  } catch {
    return { success: false, error: "Error" };
  }
}
