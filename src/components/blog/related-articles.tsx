import { prisma } from "@/lib/prisma"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { Clock, ArrowRight } from "lucide-react"

interface RelatedArticlesProps {
  currentVlogId: string
  tagSlugs: string[]
  blogCategoryId?: string | null
}

const SELECT_FIELDS = {
  title: true,
  slug: true,
  excerpt: true,
  description: true,
  coverImageUrl: true,
  thumbnailUrl: true,
  readingTime: true,
  publishedAt: true,
  createdAt: true,
  tags: { select: { name: true }, take: 2 },
} as const

export async function RelatedArticles({ currentVlogId, tagSlugs, blogCategoryId }: RelatedArticlesProps) {
  // Build OR conditions for category/tag matching (avoid empty OR array)
  const orConditions = [
    ...(blogCategoryId ? [{ blogCategoryId }] : []),
    ...(tagSlugs.length > 0 ? [{ tags: { some: { slug: { in: tagSlugs } } } }] : []),
  ]

  const related = await prisma.vlog.findMany({
    where: {
      isPublished: true,
      id: { not: currentVlogId },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    },
    select: SELECT_FIELDS,
    take: 4,
    orderBy: { viewCount: "desc" },
  })

  // If not enough by tags/category, fill with recent articles
  if (related.length < 3) {
    const existingSlugs = related.map(r => r.slug)
    const filler = await prisma.vlog.findMany({
      where: {
        isPublished: true,
        id: { not: currentVlogId },
        slug: { notIn: existingSlugs },
      },
      select: SELECT_FIELDS,
      take: 4 - related.length,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    })
    related.push(...filler)
  }

  if (related.length === 0) return null

  return (
    <section className="rounded-2xl border satine-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
          Related Articles
        </span>
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {related.map((article) => {
          const cover = article.coverImageUrl || article.thumbnailUrl
          return (
            <Link
              key={article.slug}
              href={`/vlogs/${article.slug}`}
              className="group flex gap-3 rounded-xl border border-border/40 p-3 hover:border-[rgba(232,168,64,0.30)] transition-colors"
            >
              {cover && (
                <div className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden">
                  <Image src={cover} alt={article.title} fill className="object-cover" sizes="80px" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-[#e8a840] transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {article.readingTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readingTime} min
                    </span>
                  )}
                  {article.tags.length > 0 && (
                    <span className="text-[#e07850]">{article.tags[0].name}</span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#e8a840] shrink-0 mt-1 transition-colors" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
