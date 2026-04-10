"use server"

import { revalidatePath } from "next/cache"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import type { ActionResult } from "@/types"

export async function voteComment(
  commentId: string,
  value: 1 | -1,
  postSlug: string
): Promise<ActionResult<{ score: number; userVote: number | null }>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in to vote" }

  try {
    const existing = await prisma.commentVote.findUnique({
      where: { userId_commentId: { userId, commentId } },
    })
    const commentData = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    })
    const authorId = commentData?.authorId

    if (existing) {
      if (existing.value === value) {
        // Toggle off
        const karmaChange = existing.value === 1 ? -3 : 1
        await prisma.$transaction([
          prisma.commentVote.delete({ where: { id: existing.id } }),
          prisma.comment.update({ where: { id: commentId }, data: { score: { decrement: value } } }),
          ...(authorId ? [prisma.profile.update({ where: { id: authorId }, data: { karma: { increment: karmaChange } } })] : []),
        ])
      } else {
        // Flip vote
        const karmaDelta = value === 1 ? 4 : -4
        await prisma.$transaction([
          prisma.commentVote.update({ where: { id: existing.id }, data: { value } }),
          prisma.comment.update({ where: { id: commentId }, data: { score: { increment: value * 2 } } }),
          ...(authorId ? [prisma.profile.update({ where: { id: authorId }, data: { karma: { increment: karmaDelta } } })] : []),
        ])
      }
    } else {
      const karmaChange = value === 1 ? 3 : -1
      await prisma.$transaction([
        prisma.commentVote.create({ data: { userId, commentId, value } }),
        prisma.comment.update({ where: { id: commentId }, data: { score: { increment: value } } }),
        ...(authorId ? [prisma.profile.update({ where: { id: authorId }, data: { karma: { increment: karmaChange } } })] : []),
      ])
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { score: true },
    })
    const newVote = await prisma.commentVote.findUnique({
      where: { userId_commentId: { userId, commentId } },
      select: { value: true },
    })

    revalidatePath(`/post/${postSlug}`)
    return {
      success: true,
      data: { score: comment?.score ?? 0, userVote: newVote?.value ?? null },
    }
  } catch (error) {
    return { success: false, error: safeError("Failed to vote", error) };
  }
}
