/**
 * Universal @mention resolver.
 * /go/[slug] → tries venues, then 404.
 */
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

interface Props { params: Promise<{ slug: string }> }

export default async function MentionResolverPage({ params }: Props) {
  const { slug } = await params

  const venue = await prisma.venue.findUnique({ where: { slug }, select: { slug: true } })
  if (venue) redirect(`/places/${slug}`)

  notFound()
}
