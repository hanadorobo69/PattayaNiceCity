import { prisma } from "@/lib/prisma"

/** Get all conversations for a user with other participant info, last message, and unread count */
export async function getConversationsForUser(userId: string) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { profileId: userId },
    include: {
      conversation: {
        include: {
          participants: {
            where: { profileId: { not: userId } },
            include: {
              profile: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, username: true, displayName: true } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  })

  return participations.map((p) => {
    const other = p.conversation.participants[0]?.profile
    const lastMessage = p.conversation.messages[0] || null

    return {
      conversationId: p.conversationId,
      otherUser: other || null,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.displayName || lastMessage.sender.username,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      lastReadAt: p.lastReadAt.toISOString(),
      updatedAt: p.conversation.updatedAt.toISOString(),
    }
  })
}

/** Get messages for a conversation (paginated, newest first) */
export async function getMessagesForConversation(
  conversationId: string,
  userId: string,
  cursor?: string,
  take = 50
) {
  // Verify user is participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId, profileId: userId } },
  })
  if (!participant) return null

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  const hasMore = messages.length > take
  const items = (hasMore ? messages.slice(0, take) : messages).map((m) => ({
    id: m.id,
    content: m.content,
    senderId: m.senderId,
    sender: m.sender,
    createdAt: m.createdAt.toISOString(),
  }))

  return {
    messages: items.reverse(), // chronological order
    nextCursor: hasMore ? messages[take - 1].id : null,
  }
}

/** Get total unread count across all conversations */
export async function getUnreadCountForUser(userId: string): Promise<number> {
  const participations = await prisma.conversationParticipant.findMany({
    where: { profileId: userId },
    select: { conversationId: true, lastReadAt: true },
  })

  if (participations.length === 0) return 0

  let total = 0
  for (const p of participations) {
    const count = await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: userId },
        createdAt: { gt: p.lastReadAt },
      },
    })
    total += count
  }

  return total
}

/** Get unread count for a specific conversation */
export async function getUnreadCountForConversation(
  conversationId: string,
  userId: string
): Promise<number> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId, profileId: userId } },
  })
  if (!participant) return 0

  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      createdAt: { gt: participant.lastReadAt },
    },
  })
}
