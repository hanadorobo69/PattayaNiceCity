import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"

// GET: fetch notification count + recent notifications
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ count: 0, notifications: [] })

  try {
    const [count, notifications] = await Promise.all([
      prisma.notification.count({ where: { recipientId: userId, read: false } }),
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: { select: { username: true, displayName: true, avatarUrl: true } },
          post: { select: { slug: true, title: true } },
        },
      }),
    ])
    return NextResponse.json({ count, notifications })
  } catch {
    return NextResponse.json({ count: 0, notifications: [] })
  }
}

// POST: mark notifications as read
export async function POST() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    await prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
