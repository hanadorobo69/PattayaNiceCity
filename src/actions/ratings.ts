"use server"

import { revalidatePath } from "next/cache"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import { getCriteriaForCategory } from "@/lib/rating-criteria"
import { z } from "zod"
import type { ActionResult } from "@/types"

const ratingSchema = z.object({
  postId: z.string(),
  categorySlug: z.string(),
  overall: z.number().int().min(1).max(5),
  scores: z.record(z.number().int().min(1).max(5)),
  comment: z.string().max(1000).optional(),
})

export interface CriteriaAvg {
  key: string
  label: string
  avg: number
}

export interface RatingData {
  overall: number
  count: number
  criteriaAvgs: CriteriaAvg[]
  userRating: {
    overall: number
    scores: Record<string, number>
    comment: string | null
  } | null
}

export async function submitRating(input: unknown): Promise<ActionResult<void>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in to rate" }

  const parsed = ratingSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { postId, overall, scores, comment } = parsed.data

  try {
    await prisma.rating.upsert({
      where: { authorId_postId: { authorId: userId, postId } },
      create: {
        authorId: userId,
        postId,
        overall,
        scores: JSON.stringify(scores),
        comment: comment || null,
      },
      update: {
        overall,
        scores: JSON.stringify(scores),
        comment: comment || null,
      },
    })

    // Recalculate post score from avg overall rating
    const allRatings = await prisma.rating.findMany({
      where: { postId },
      select: { overall: true },
    })
    const avgOverall = allRatings.reduce((sum, r) => sum + r.overall, 0) / allRatings.length

    await prisma.post.update({
      where: { id: postId },
      data: { score: Math.round(avgOverall * 10) },
    })

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })
    if (post) {
      revalidatePath(`/post/${post.slug}`)
      revalidatePath("/")
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to submit rating", error) };
  }
}

export async function getPostRatings(postId: string, categorySlug: string): Promise<ActionResult<RatingData>> {
  const userId = await getCurrentUserId()

  try {
    const [allRatings, userRating] = await Promise.all([
      prisma.rating.findMany({
        where: { postId },
        select: { overall: true, scores: true },
      }),
      userId ? prisma.rating.findUnique({
        where: { authorId_postId: { authorId: userId, postId } },
        select: { overall: true, scores: true, comment: true },
      }) : null,
    ])

    const count = allRatings.length
    const avgOverall = count > 0
      ? Number((allRatings.reduce((s, r) => s + r.overall, 0) / count).toFixed(1))
      : 0

    // Compute per-criteria averages across all ratings
    const criteria = getCriteriaForCategory(categorySlug)
    const criteriaAvgs: CriteriaAvg[] = criteria.map(({ key, label }) => {
      const values = allRatings
        .map(r => {
          try { return (JSON.parse(r.scores) as Record<string, number>)[key] } catch { return undefined }
        })
        .filter((v): v is number => typeof v === "number" && v > 0)

      return {
        key,
        label,
        avg: values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0,
      }
    })

    const parsedUserRating = userRating
      ? {
          overall: userRating.overall,
          scores: (() => { try { return JSON.parse(userRating.scores) as Record<string, number> } catch { return {} } })(),
          comment: userRating.comment,
        }
      : null

    return {
      success: true,
      data: { overall: avgOverall, count, criteriaAvgs, userRating: parsedUserRating },
    }
  } catch (error) {
    return { success: false, error: safeError("Failed to load ratings", error) };
  }
}
