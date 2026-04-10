"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import { rateLimit } from "@/lib/rate-limit"
import type { ActionResult } from "@/types"

/** Send a message in an existing conversation or start a new one */
export async function sendMessage(formData: FormData): Promise<ActionResult<{ messageId: string; conversationId: string }>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  const rl = rateLimit(`msg:${userId}`, 30, 60_000)
  if (!rl.ok) return { success: false, error: "Too many messages. Slow down." }

  const content = (formData.get("content") as string)?.trim()
  if (!content || content.length === 0) return { success: false, error: "Message cannot be empty" }
  if (content.length > 3000) return { success: false, error: "Message too long" }

  const conversationId = formData.get("conversationId") as string | null
  const recipientId = formData.get("recipientId") as string | null

  let convoId = conversationId

  if (!convoId) {
    if (!recipientId) return { success: false, error: "No recipient specified" }
    if (recipientId === userId) return { success: false, error: "Cannot message yourself" }

    // Find or create conversation
    const result = await getOrCreateConversation(recipientId)
    if (!result.success) return result
    convoId = result.data.conversationId
  }

  // Verify user is participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId: convoId, profileId: userId } },
  })
  if (!participant) return { success: false, error: "Not a participant in this conversation" }

  try {
    const message = await prisma.message.create({
      data: {
        content,
        conversationId: convoId,
        senderId: userId,
      },
    })

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: convoId },
      data: { updatedAt: new Date() },
    })

    return { success: true, data: { messageId: message.id, conversationId: convoId } }
  } catch (error) {
    console.error("sendMessage error:", error)
    return { success: false, error: "Failed to send message" }
  }
}

/** Find or create a 1-on-1 conversation with a user */
export async function getOrCreateConversation(recipientId: string): Promise<ActionResult<{ conversationId: string }>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }
  if (recipientId === userId) return { success: false, error: "Cannot message yourself" }

  // Check recipient exists
  const recipient = await prisma.profile.findUnique({ where: { id: recipientId }, select: { id: true } })
  if (!recipient) return { success: false, error: "User not found" }

  // Find existing conversation between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { profileId: userId } } },
        { participants: { some: { profileId: recipientId } } },
      ],
    },
    select: { id: true },
  })

  if (existing) return { success: true, data: { conversationId: existing.id } }

  // Create new conversation
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { profileId: userId },
          { profileId: recipientId },
        ],
      },
    },
  })

  return { success: true, data: { conversationId: conversation.id } }
}

/** Mark a conversation as read */
export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    await prisma.conversationParticipant.update({
      where: { conversationId_profileId: { conversationId, profileId: userId } },
      data: { lastReadAt: new Date() },
    })
  } catch (error) {
    console.error("markConversationRead error:", error)
    return { success: false, error: "Failed to mark as read" }
  }

  return { success: true, data: undefined }
}
