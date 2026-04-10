import { NextRequest, NextResponse } from "next/server";
import { prisma, safeAuthorSelect } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { createCommentSchema } from "@/validations/comment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, deletedAt: null },
      include: {
        author: { select: safeAuthorSelect },
        replies: {
          where: { deletedAt: null },
          include: { author: { select: safeAuthorSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET /api/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content, postId, parentId } = parsed.data;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: { content, postId, authorId: userId, parentId: parentId || null },
      include: { author: { select: safeAuthorSelect } },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
