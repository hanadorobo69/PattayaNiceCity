import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (q.length < 1) return NextResponse.json({ venues: [] })

  // Expand query for letter-digit boundary variations: "soi6" -> also "soi 6"
  const withSpaces = q.replace(/([a-z])(\d)/gi, "$1 $2").replace(/(\d)([a-z])/gi, "$1 $2")
  const collapsed = q.replace(/([a-z])\s+(\d)/gi, "$1$2").replace(/(\d)\s+([a-z])/gi, "$1$2")
  const variants = [...new Set([q, withSpaces, collapsed])]

  const orConditions = variants.flatMap((v) => [
    { name: { contains: v, mode: "insensitive" as const } },
    { slug: { contains: v, mode: "insensitive" as const } },
    { category: { name: { contains: v, mode: "insensitive" as const } } },
  ])

  try {
    const venues = await prisma.venue.findMany({
      where: {
        isActive: true,
        OR: orConditions,
      },
      include: { category: { select: { name: true, slug: true, icon: true } } },
      take: 6,
      orderBy: { name: "asc" },
    })

    const venueResults = venues.map((v: typeof venues[number]) => ({
      slug: v.slug,
      name: v.name,
      type: "venue" as const,
      category: { name: v.category.name, slug: v.category.slug, icon: v.category.icon },
    }))

    return NextResponse.json({ venues: venueResults })
  } catch {
    return NextResponse.json({ venues: [] })
  }
}
