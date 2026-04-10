import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"

/** GET /api/messages?conversationId=xxx&after=ISO_DATE - poll new messages */
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const conversationId = searchParams.get("conversationId")
  const after = searchParams.get("after")

  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  // Verify user is participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId, profileId: userId } },
  })
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      sender: m.sender,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}
