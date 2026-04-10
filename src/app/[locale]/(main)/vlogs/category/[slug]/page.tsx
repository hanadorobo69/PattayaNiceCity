import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import Script from "next/script"
import { prisma } from "@/lib/prisma"
import { Calendar, Clock, Eye, Tag } from "lucide-react"
import { MentionText } from "@/components/ui/mention-text"
import { formatRelativeDate } from "@/lib/utils"
import { getLocale } from "next-intl/server"

export const revalidate = 60

interface CategoryArchiveProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CategoryArchiveProps): Promise<Metadata> {
  const { slug } = await params
  const category = await prisma.blogCategory.findUnique({ where: { slug } })
  if (!category) return { title: "Category Not Found" }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"
  const title = `${category.name} - Pattaya Nice City Blog | Nightlife Guides & Tips`
  const description = category.description || `All articles about ${category.name}. In-depth Pattaya guides, reviews, and insider tips - updated 2026.`

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/vlogs/category/${slug}` },
    openGraph: {
      title: `${category.name} - Pattaya Nice City Blog`,
      description,
      type: "website",
      url: `${siteUrl}/vlogs/category/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  try {
    const categories = await prisma.blogCategory.findMany({ select: { slug: true } })
    return categories.map(c => ({ slug: c.slug }))
  } catch {
    return []
  }
}

export default async function CategoryArchivePage({ params }: CategoryArchiveProps) {
  const { slug } = await params
  const locale = await getLocale()

  const category = await prisma.blogCategory.findUnique({ where: { slug } })
  if (!category) notFound()

  const vlogs = await prisma.vlog.findMany({
    where: { isPublished: true, blogCategory: { slug } },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      tags: { select: { name: true, slug: true } },
      blogCategory: { select: { name: true, slug: true, color: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  })

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} - Pattaya Nightlife Articles`,
    description: category.description || `All articles about ${category.name} on Pattaya Nice City.`,
    url: `${siteUrl}/vlogs/category/${slug}`,
    isPartOf: { "@type": "WebSite", name: "Pattaya Nice City", url: siteUrl },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: vlogs.length,
      itemListElement: vlogs.slice(0, 50).map((vlog, i) => ({
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
        },
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/vlogs` },
        { "@type": "ListItem", position: 3, name: category.name, item: `${siteUrl}/vlogs/category/${slug}` },
      ],
    },
  }

  return (
    <>
      <Script id="category-archive-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="mb-3" />
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] leading-none">
            <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{category.name}</span>
          </h1>
          {category.description && (
            <p className="text-muted-foreground text-sm mt-2">{category.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{vlogs.length} article{vlogs.length !== 1 ? "s" : ""}</p>
        </div>

        {vlogs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No articles in this category yet.</p>
            <Link href="/vlogs" className="text-[#e8a840] hover:text-[#3db8a0] transition-colors text-sm mt-2 inline-block">
              View all articles
            </Link>
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
                  <div className="aspect-[16/9] bg-gradient-to-br from-[rgba(36,28,20,0.9)] to-[rgba(26,21,16,0.7)] relative overflow-hidden">
                    {coverImg ? (
                      <Image
                        src={coverImg}
                        alt={vlog.coverImageAlt || vlog.title}
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
                    {vlog.readingTime > 0 && (
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs flex items-center gap-1 text-white/90">
                        <Clock className="h-3 w-3" />
                        {vlog.readingTime} min read
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
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
