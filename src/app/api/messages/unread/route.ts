import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth/session"
import { getUnreadCountForUser } from "@/lib/messages"

/** GET /api/messages/unread - total unread message count for badge */
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ count: 0 })

  const count = await getUnreadCountForUser(userId)
  return NextResponse.json({ count })
}
