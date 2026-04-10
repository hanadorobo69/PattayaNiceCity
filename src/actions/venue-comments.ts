"use server"

import { revalidatePath } from "next/cache"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"

import { rateLimit } from "@/lib/rate-limit"
import { cookies } from "next/headers"

const prismaAny = prisma as any

export async function createVenueComment(formData: FormData) {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in to comment" }

  const rl = rateLimit(`venue-comment:${userId}`, 10, 60_000)
  if (!rl.ok) return { success: false, error: "Too many comments. Please try again in a minute." }

  const content = (formData.get("content") as string)?.trim()
  const venueId = formData.get("venueId") as string
  const parentId = (formData.get("parentId") as string) || null

  if (!content || content.length < 2) return { success: false, error: "Comment too short (min 2 characters)" }
  if (content.length > 2000) return { success: false, error: "Comment too long (max 2000 characters)" }
  if (!venueId) return { success: false, error: "Venue not found" }

  if (!prismaAny.venueComment) return { success: false, error: "Not available" }

  try {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } })
    if (!venue) return { success: false, error: "Venue not found" }

    const comment = await prismaAny.venueComment.create({
      data: { content, venueId, authorId: userId, parentId, sourceLanguage: (await cookies()).get("NEXT_LOCALE")?.value || "en" },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, isAdmin: true } } },
    })

    await prisma.profile.update({ where: { id: userId }, data: { karma: { increment: 2 } } })
    revalidatePath(`/places/${venue.slug}`)
    return { success: true, data: comment }
  } catch (error) {
    return { success: false, error: safeError("Failed to create comment", error) };
  }
}

export async function getVenueComments(venueId: string) {
  if (!prismaAny.venueComment) return []
  try {
    const authorSelect = { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, isAdmin: true } }
    const allComments = await prismaAny.venueComment.findMany({
      where: { venueId, deletedAt: null },
      include: { author: authorSelect },
      orderBy: { createdAt: "asc" },
    })
    // Build tree from flat list
    const map = new Map<string, any>()
    for (const c of allComments) map.set(c.id, { ...c, replies: [] })
    const roots: any[] = []
    for (const c of map.values()) {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(c)
      } else if (!c.parentId) {
        roots.push(c)
      }
    }
    // Reverse roots so newest first (matches old behavior)
    return roots.reverse()
  } catch (error) {
    safeError("Failed to load venue comments", error);
    return []
  }
}

export async function voteVenueComment(commentId: string, value: 1 | -1, venueSlug: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  if (!prismaAny.venueCommentVote) return { success: false, error: "Not available" }

  try {
    const existing = await prismaAny.venueCommentVote.findUnique({
      where: { userId_commentId: { userId, commentId } },
    })

    if (existing) {
      if (existing.value === value) {
        await prismaAny.venueCommentVote.delete({ where: { id: existing.id } })
        await prismaAny.venueComment.update({ where: { id: commentId }, data: { score: { decrement: value } } })
      } else {
        await prismaAny.venueCommentVote.update({ where: { id: existing.id }, data: { value } })
        await prismaAny.venueComment.update({ where: { id: commentId }, data: { score: { increment: value * 2 } } })
      }
    } else {
      await prismaAny.venueCommentVote.create({ data: { userId, commentId, value } })
      await prismaAny.venueComment.update({ where: { id: commentId }, data: { score: { increment: value } } })
    }

    revalidatePath(`/places/${venueSlug}`)
    const updated = await prismaAny.venueComment.findUnique({ where: { id: commentId } })
    const currentVote = existing?.value === value ? null : value
    return { success: true, data: { score: updated?.score ?? 0, userVote: currentVote } }
  } catch (error) {
    return { success: false, error: safeError("Failed to vote on comment", error) };
  }
}

export async function adminDeleteVenueComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" }
  if (!prismaAny.venueComment) return { success: false, error: "Not available" }

  try {
    await prismaAny.venueComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete comment", error) };
  }
}
