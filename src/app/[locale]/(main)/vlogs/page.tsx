import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import Script from "next/script"
import { prisma } from "@/lib/prisma"
import { Calendar, Clock, Eye, Tag, Layers } from "lucide-react"
import { MentionText } from "@/components/ui/mention-text"
import { formatRelativeDate } from "@/lib/utils"
import { buildWebPageJsonLd } from "@/lib/jsonld"
import { getLocale } from "next-intl/server"

export const revalidate = 60

interface VlogsPageProps {
  searchParams: Promise<{ tag?: string; category?: string }>
}

export async function generateMetadata({ searchParams }: VlogsPageProps): Promise<Metadata> {
  const { tag, category } = await searchParams
  const suffix = tag ? ` - #${tag}` : category ? ` - ${category}` : ""

  return {
    title: `Blog${suffix} - Pattaya Nice City | Nightlife Guides, Reviews & Insider Tips`,
    description: "In-depth guides, reviews, and insider tips about Pattaya guide. restaurants, beaches, activities, prices, and everything you need to know - updated 2026.",
    openGraph: {
      title: `Blog${suffix} - Pattaya Nice City`,
      description: "In-depth guides, reviews, and insider tips about Pattaya guide. Updated regularly by the Pattaya Nice City Team.",
      type: "website",
    },
  }
}

export default async function VlogsPage({ searchParams }: VlogsPageProps) {
  const { tag: tagSlug, category: categorySlug } = await searchParams
  const locale = await getLocale()

  // Build where clause based on filters
  const where: Record<string, unknown> = { isPublished: true }
  if (tagSlug) where.tags = { some: { slug: tagSlug } }
  if (categorySlug) where.blogCategory = { slug: categorySlug }

  const [vlogs, allCategories, allTags] = await Promise.all([
    prisma.vlog.findMany({
      where,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        tags: { select: { name: true, slug: true } },
        blogCategory: { select: { name: true, slug: true, color: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.blogCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.blogTag.findMany({
      where: { vlogs: { some: { isPublished: true } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Pattaya Nice City Blog - Nightlife Guides & Reviews",
    description: "In-depth articles covering Pattaya guide, restaurants, beaches, activities, prices, and insider tips.",
    url: `${siteUrl}/vlogs`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: vlogs.length,
      itemListElement: vlogs.slice(0, 30).map((vlog, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Article",
          headline: vlog.title,
          description: (vlog.excerpt || vlog.description).slice(0, 200),
          url: `${siteUrl}/vlogs/${vlog.slug}`,
          image: vlog.coverImageUrl || vlog.thumbnailUrl || undefined,
          datePublished: (vlog.publishedAt || vlog.createdAt).toISOString(),
          dateModified: vlog.updatedAt.toISOString(),
          author: {
            "@type": "Organization",
            name: "Pattaya Nice City Team",
            url: `${siteUrl}/about`,
          },
        },
      })),
    },
  }

  const webPageJsonLd = buildWebPageJsonLd({
    title: "Blog - Pattaya Nice City | Nightlife Guides, Reviews & Insider Tips",
    description: "In-depth guides, reviews, and insider tips about Pattaya guide. restaurants, beaches, activities, prices, and everything you need to know.",
    url: `${siteUrl}/vlogs`,
    siteUrl,
    type: "CollectionPage",
  })

  const hasFilters = !!tagSlug || !!categorySlug

  return (
    <>
      <Script id="vlogs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Script id="webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] leading-none">
            <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Blog</span>
          </h1>
        </div>

        {/* Category filter tabs */}
        {allCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vlogs"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !categorySlug ? "bg-[rgba(232,168,64,0.15)] border-[rgba(232,168,64,0.40)] text-[#e8a840]" : "border-border text-muted-foreground hover:border-[rgba(232,168,64,0.30)]"
              }`}
            >
              <Layers className="h-3 w-3" />
              All
            </Link>
            {allCategories.map(cat => (
              <Link
                key={cat.slug}
                href={`/vlogs/category/${cat.slug}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:opacity-80 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Tags filter bar */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Link
                key={tag.slug}
                href={`/vlogs/tag/${tag.slug}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[rgba(224,120,80,0.15)] border border-[rgba(224,120,80,0.30)] text-[#e07850] hover:bg-[rgba(224,120,80,0.25)] transition-colors"
              >
                <Tag className="h-3 w-3" />
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Active filter indicator */}
        {hasFilters && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing {vlogs.length} article{vlogs.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <Link href="/vlogs" className="text-[#e8a840] hover:text-[#3db8a0] transition-colors">
              Clear filters
            </Link>
          </div>
        )}

        {vlogs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>{hasFilters ? "No articles matching this filter." : "No articles yet. Stay tuned!"}</p>
            {hasFilters && (
              <Link href="/vlogs" className="text-[#e8a840] hover:text-[#3db8a0] transition-colors text-sm mt-2 inline-block">
                View all articles
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {vlogs.map((vlog) => {
              const coverImg = vlog.coverImageUrl || vlog.thumbnailUrl
              const displayDate = vlog.publishedAt || vlog.createdAt

              return (
                <Link
                  key={vlog.id}
                  href={`/vlogs/${vlog.slug}`}
                  className="group block rounded-xl glass-card overflow-hidden venue-card"
                >
                  {/* Cover image */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-[rgba(36,28,20,0.9)] to-[rgba(26,21,16,0.7)] relative overflow-hidden">
                    {coverImg ? (
                      <Image
                        src={coverImg}
                        alt={vlog.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-4xl font-bold font-[family-name:var(--font-orbitron)] text-[rgba(224,120,80,0.20)]">PVC</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1510] via-transparent to-transparent opacity-60" />

                    {/* Reading time badge */}
                    {vlog.readingTime > 0 && (
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs flex items-center gap-1 text-white/90">
                        <Clock className="h-3 w-3" />
                        {vlog.readingTime} min read
                      </div>
                    )}

                    {/* Category badge */}
                    {vlog.blogCategory && (
                      <div
                        className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
                        style={{ backgroundColor: `${vlog.blogCategory.color}30`, color: vlog.blogCategory.color }}
                      >
                        {vlog.blogCategory.name}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    {/* Tags */}
                    {vlog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {vlog.tags.slice(0, 3).map(tag => (
                          <span key={tag.slug} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(224,120,80,0.15)] text-[#e07850]">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="font-semibold text-base group-hover:text-[#e8a840] transition-colors line-clamp-2">
                      {vlog.title}
                    </h2>

                    {(vlog.excerpt || vlog.description) && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        <MentionText content={vlog.excerpt || vlog.description} hashtagContext="community" />
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeDate(displayDate, locale)}
                      </span>
                      {vlog.viewCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {vlog.viewCount.toLocaleString()}
                        </span>
                      )}
                      <span>by {vlog.author.displayName || vlog.author.username}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
