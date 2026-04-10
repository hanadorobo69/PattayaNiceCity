"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import type { ActionResult, VoteValue } from "@/types";

interface VoteResult {
  score: number;
  userVote: VoteValue | null;
}

export async function voteOnPost(postId: string, value: VoteValue): Promise<ActionResult<VoteResult>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in to vote" };

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { success: false, error: "Post not found" };

  try {
    const existingVote = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    let newScore: number;
    let userVote: VoteValue | null;

    if (existingVote && existingVote.value === value) {
      // Toggle off - remove vote
      const karmaChange = existingVote.value === 1 ? -5 : 2 // undo the effect
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.delete({ where: { userId_postId: { userId, postId } } }),
        prisma.post.update({ where: { id: postId }, data: { score: { decrement: value } } }),
        prisma.profile.update({ where: { id: post.authorId }, data: { karma: { increment: karmaChange } } }),
      ]);
      newScore = updatedPost.score;
      userVote = null;
    } else if (existingVote) {
      // Change vote direction (e.g. downvote → upvote = +5 +2 = +7 karma swing)
      const scoreDelta = value - existingVote.value;
      const karmaDelta = value === 1 ? 7 : -7 // full swing
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.update({ where: { userId_postId: { userId, postId } }, data: { value } }),
        prisma.post.update({ where: { id: postId }, data: { score: { increment: scoreDelta } } }),
        prisma.profile.update({ where: { id: post.authorId }, data: { karma: { increment: karmaDelta } } }),
      ]);
      newScore = updatedPost.score;
      userVote = value;
    } else {
      // New vote
      const karmaChange = value === 1 ? 5 : -2
      const [, updatedPost] = await prisma.$transaction([
        prisma.vote.create({ data: { userId, postId, value } }),
        prisma.post.update({ where: { id: postId }, data: { score: { increment: value } } }),
        prisma.profile.update({ where: { id: post.authorId }, data: { karma: { increment: karmaChange } } }),
      ]);
      newScore = updatedPost.score;
      userVote = value;
    }

    revalidatePath("/");
    revalidatePath(`/post/${post.slug}`);
    return { success: true, data: { score: newScore, userVote } };
  } catch (error) {
    console.error("voteOnPost error:", error);
    return { success: false, error: "Failed to vote" };
  }
}

export async function getUserVote(postId: string): Promise<ActionResult<VoteValue | null>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: true, data: null };

  try {
    const vote = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return { success: true, data: (vote?.value as VoteValue) ?? null };
  } catch (error) {
    console.error("getUserVote error:", error);
    return { success: false, error: "Error" };
  }
}
