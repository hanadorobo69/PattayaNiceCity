import { prisma } from "@/lib/prisma"

/**
 * Extract !username mentions from text content
 */
export function extractUserMentions(content: string): string[] {
  const matches = content.match(/(?<![a-zA-Z0-9])!([a-zA-Z0-9_-]+)/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

/**
 * Create notifications for all !mentioned users in a post or comment.
 * Does NOT notify the author (you don't notify yourself).
 */
export async function createMentionNotifications({
  content,
  actorId,
  postId,
  commentId,
  type,
}: {
  content: string
  actorId: string
  postId?: string
  commentId?: string
  type: "mention_post" | "mention_comment"
}) {
  const usernames = extractUserMentions(content)
  if (usernames.length === 0) return

  // Look up mentioned users
  const users = await prisma.profile.findMany({
    where: { username: { in: usernames, mode: "insensitive" } },
    select: { id: true },
  })

  // Create notifications (skip self-mentions)
  const notifs = users
    .filter(u => u.id !== actorId)
    .map(u => ({
      type,
      recipientId: u.id,
      actorId,
      postId: postId ?? null,
      commentId: commentId ?? null,
    }))

  if (notifs.length > 0) {
    await prisma.notification.createMany({ data: notifs })
  }
}
