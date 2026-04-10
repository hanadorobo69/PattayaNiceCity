import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { qi, param, timestampParam } from "@/lib/db-utils"
import { unstable_cache } from "next/cache"
import { Star, Hash, TrendingUp, Flame } from "lucide-react"
import { getTranslations } from "next-intl/server"

const getTrendingVenues = unstable_cache(async () => {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get all active venues with their ratings and recent mentions
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    include: {
      category: { select: { icon: true, name: true, slug: true } },
      venueRatings: { select: { overall: true } },
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  })

  // Count recent @mentions in batch (2 queries total instead of 2 per venue)
  const slugs = venues.map(v => v.slug)
  const mentionsBySlug: Record<string, number> = {}
  if (slugs.length > 0) {
    const dateIdx = slugs.length + 1
    const caseClauses = slugs.map((_, i) =>
      `SUM(CASE WHEN ${qi("content")} LIKE ${param(i + 1)} THEN 1 ELSE 0 END) as ${qi(`c${i}`)}`
    ).join(", ")
    const likeParams = slugs.map(s => `%@${s}%`)
    const sinceISO = since7d.toISOString()

    const [postCounts, commentCounts] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT ${caseClauses} FROM ${qi("Post")} WHERE ${qi("createdAt")} >= ${timestampParam(dateIdx)}`, ...likeParams, sinceISO) as Promise<any[]>,
      prisma.$queryRawUnsafe(`SELECT ${caseClauses} FROM ${qi("Comment")} WHERE ${qi("createdAt")} >= ${timestampParam(dateIdx)}`, ...likeParams, sinceISO) as Promise<any[]>,
    ])

    for (let i = 0; i < slugs.length; i++) {
      mentionsBySlug[slugs[i]] = Number(postCounts[0]?.[`c${i}`] ?? 0) + Number(commentCounts[0]?.[`c${i}`] ?? 0)
    }
  }

  const venueScores = venues.map((venue) => {
    const recentMentions = mentionsBySlug[venue.slug] ?? 0
    const avgRating = venue.venueRatings.length > 0
      ? venue.venueRatings.reduce((s, r) => s + r.overall, 0) / venue.venueRatings.length
      : null
    const ratingCount = venue.venueRatings.length

    // Hot score: mentions * 3 + recentPosts * 2 + rating * ratingCount
    const hotScore = recentMentions * 3 + ratingCount * 2 + (avgRating ?? 0) * ratingCount

    return {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      category: venue.category,
      avgRating,
      ratingCount,
      recentMentions,
      postCount: venue._count.posts,
      hotScore,
    }
  })

  return venueScores
    .filter(v => v.hotScore > 0 || v.ratingCount > 0 || v.postCount > 0)
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5)
}, ["trending-venues"], { revalidate: 300 })

export async function TrendingVenues() {
  const venues = await getTrendingVenues()
  const t = await getTranslations("sidebar")
  const tcom = await getTranslations("common")
  const tcat = await getTranslations("categoryNames")

  if (venues.length === 0) return null

  return (
    <div className="rounded-xl border satine-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("trendingSpots")}</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{t("sevenDays")}</span>
      </div>
      <div className="space-y-3">
        {venues.map((venue, i) => (
          <Link
            key={venue.id}
            href={`/places/${venue.slug}`}
            className="flex gap-3 group"
          >
            <span
              className="text-xl font-bold w-5 shrink-0 leading-none pt-0.5"
              style={{ color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD7C2F" : undefined }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {venue.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{venue.category.icon} {tcat.has(venue.category.slug) ? tcat(venue.category.slug) : venue.category.name}</span>
                {venue.avgRating && (
                  <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    {venue.avgRating.toFixed(1)}
                  </span>
                )}
                {venue.recentMentions > 0 && (
                  <span className="text-xs text-primary flex items-center gap-0.5">
                    <Hash className="h-2.5 w-2.5" />
                    {venue.recentMentions}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/" className="block text-center text-xs text-primary hover:underline pt-1 border-t border-[rgba(232,168,64,0.15)]">
        {tcom("viewAll")}
      </Link>
    </div>
  )
}
