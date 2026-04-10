import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { z } from "zod";

const favoriteSchema = z.object({
  postId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = favoriteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { postId } = parsed.data;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_postId: { userId, postId } } });
      return NextResponse.json({ favorited: false });
    } else {
      await prisma.favorite.create({ data: { userId, postId } });
      return NextResponse.json({ favorited: true });
    }
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
