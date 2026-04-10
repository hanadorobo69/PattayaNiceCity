import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { z } from "zod";

const voteSchema = z.object({
  postId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { postId, value } = parsed.data;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingVote = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    let newScore: number;

    if (existingVote && existingVote.value === value) {
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.delete({ where: { userId_postId: { userId, postId } } }),
        prisma.post.update({ where: { id: postId }, data: { score: { decrement: value } } }),
      ]);
      newScore = updatedPost.score;
    } else if (existingVote) {
      const scoreDelta = value - existingVote.value;
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.update({ where: { userId_postId: { userId, postId } }, data: { value } }),
        prisma.post.update({ where: { id: postId }, data: { score: { increment: scoreDelta } } }),
      ]);
      newScore = updatedPost.score;
    } else {
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.create({ data: { userId, postId, value } }),
        prisma.post.update({ where: { id: postId }, data: { score: { increment: value } } }),
      ]);
      newScore = updatedPost.score;
    }

    return NextResponse.json({ score: newScore });
  } catch (error) {
    console.error("POST /api/votes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
