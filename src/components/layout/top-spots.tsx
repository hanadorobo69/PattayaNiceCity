import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { Star, TrendingUp } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Period = "week" | "month" | "year"

const getTopPosts = unstable_cache(async (period: Period) => {
  const now = new Date()
  const since =
    period === "week"  ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    period === "month" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                         new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  return prisma.post.findMany({
    where: { createdAt: { gte: since }, deletedAt: null },
    orderBy: { score: "desc" },
    take: 3,
    include: {
      category: true,
      ratings: { select: { overall: true } },
    },
  })
}, ["top-posts"], { revalidate: 300 })

interface TopSpotsProps {
  period?: Period
}

export async function TopSpots({ period = "week" }: TopSpotsProps) {
  const posts = await getTopPosts(period)
  const t = await getTranslations("sidebar")
  const tcat = await getTranslations("categoryNames")

  const labels: Record<Period, string> = {
    week: t("thisWeek"),
    month: t("thisMonth"),
    year: t("thisYear"),
  }

  if (posts.length === 0) return null

  return (
    <div className="rounded-xl border satine-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("topPosts", { period: labels[period] })}</h3>
      </div>
      <div className="space-y-3">
        {posts.map((post, i) => {
          const avgRating = post.ratings.length > 0
            ? (post.ratings.reduce((s, r) => s + r.overall, 0) / post.ratings.length).toFixed(1)
            : null

          return (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="flex gap-3 group"
            >
              <span className="text-xl font-bold text-[rgba(232,168,64,0.30)] w-5 shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{post.category.icon} {tcat.has(post.category.slug) ? tcat(post.category.slug) : post.category.name}</span>
                  {avgRating && (
                    <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {avgRating}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
