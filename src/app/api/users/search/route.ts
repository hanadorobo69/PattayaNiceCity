import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (q.length < 1) return NextResponse.json({ users: [] })

  try {
    const users = await prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { username: true, displayName: true, avatarUrl: true, isAdmin: true },
      take: 6,
      orderBy: { karma: "desc" },
    })

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ users: [] })
  }
}
