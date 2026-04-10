"use server"

import { revalidatePath } from "next/cache"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import { getCriteriaForCategory } from "@/lib/rating-criteria"
import type { ActionResult } from "@/types"

export async function submitVenueRating(
  venueId: string,
  venueSlug: string,
  categorySlug: string,
  overall: number,
  scores: Record<string, number>,
  comment?: string
): Promise<ActionResult<{ overall: number; isUpdate: boolean }>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  // Validate overall (0.5 increments allowed)
  if (overall < 0.5 || overall > 5 || (overall * 2) % 1 !== 0) return { success: false, error: "Overall must be between 0.5 and 5 in 0.5 increments" }

  // Validate optional criteria keys (0.5 increments allowed)
  const criteria = getCriteriaForCategory(categorySlug)
  const validKeys = criteria.map(c => c.key)
  for (const key of Object.keys(scores)) {
    if (!validKeys.includes(key)) return { success: false, error: `Unknown criterion: ${key}` }
    if (scores[key] < 0.5 || scores[key] > 5 || (scores[key] * 2) % 1 !== 0) return { success: false, error: "Scores must be between 0.5 and 5 in 0.5 increments" }
  }

  const existing = await prisma.venueRating.findUnique({
    where: { authorId_venueId: { authorId: userId, venueId } },
  })

  try {
    await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: userId, venueId } },
      create: {
        authorId: userId,
        venueId,
        overall,
        scores: JSON.stringify(scores),
        comment: comment?.trim() || null,
      },
      update: {
        overall,
        scores: JSON.stringify(scores),
        comment: comment?.trim() || null,
      },
    })
    revalidatePath(`/places/${venueSlug}`)
    revalidatePath("/")
    return { success: true, data: { overall, isUpdate: !!existing } }
  } catch (error) {
    return { success: false, error: safeError("Failed to submit rating", error) };
  }
}

export async function addRatingComment(
  venueId: string,
  venueSlug: string,
  comment: string
): Promise<ActionResult<{ ok: true }>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  const trimmed = comment.trim()
  if (!trimmed) return { success: false, error: "Comment is empty" }
  if (trimmed.length > 500) return { success: false, error: "Comment is too long (max 500 chars)" }

  const prismaAny = prisma as any

  try {
    // Save comment on the rating record
    await prisma.venueRating.update({
      where: { authorId_venueId: { authorId: userId, venueId } },
      data: { comment: trimmed },
    })

    // Also post it to the venue comment wall so it's visible to everyone
    if (prismaAny.venueComment) {
      await prismaAny.venueComment.create({
        data: {
          content: trimmed,
          venueId,
          authorId: userId,
        },
      })
    }

    revalidatePath(`/places/${venueSlug}`)
    return { success: true, data: { ok: true } }
  } catch (error) {
    return { success: false, error: safeError("Failed to add comment", error) };
  }
}

export async function getMyVenueRating(venueId: string): Promise<ActionResult<{ overall: number; scores: Record<string, number> } | null>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: true, data: null }

  try {
    const rating = await prisma.venueRating.findUnique({
      where: { authorId_venueId: { authorId: userId, venueId } },
      select: { overall: true, scores: true },
    })
    if (!rating) return { success: true, data: null }
    return {
      success: true,
      data: {
        overall: rating.overall,
        scores: JSON.parse(rating.scores) as Record<string, number>,
      },
    }
  } catch (error) {
    return { success: false, error: safeError("Failed to load rating", error) };
  }
}
