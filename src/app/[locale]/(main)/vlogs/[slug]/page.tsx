import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import Script from "next/script"
import { notFound, permanentRedirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { extractYouTubeId } from "@/lib/youtube"
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, buildHowToJsonLd, type VlogForJsonLd } from "@/lib/jsonld"
import { Calendar, Clock, Eye, User, Tag, ChevronRight, MapPin, ExternalLink, Shield, Camera } from "lucide-react"
import { MarkdownContent } from "@/components/blog/markdown-content"
import { extractHeadings } from "@/lib/markdown-utils"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { RelatedArticles } from "@/components/blog/related-articles"
import { getLocale } from "next-intl/server"
import { incrementVlogViews } from "@/actions/vlogs"

export const revalidate = 300

interface VlogPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: VlogPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const vlog = await prisma.vlog.findUnique({
    where: { slug },
    select: {
      title: true, excerpt: true, description: true, metaTitle: true, metaDescription: true,
      coverImageUrl: true, coverImageAlt: true, thumbnailUrl: true, youtubeUrl: true,
      focusKeyword: true, canonicalSlug: true, publishedAt: true, lastModifiedAt: true, updatedAt: true,
      readingTime: true, translations: true,
      tags: { select: { name: true } },
      blogCategory: { select: { name: true } },
    },
  })
  if (!vlog) return { title: "Article not found" }

  // Apply locale-specific translations if available
  const trans = (vlog.translations as Record<string, any>)?.[locale]
  const localTitle = trans?.title || vlog.title
  const localExcerpt = trans?.excerpt || vlog.excerpt
  const localMetaDesc = trans?.metaDescription || vlog.metaDescription

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"
  const seoTitle = localMetaDesc ? (vlog.metaTitle || `${localTitle} - Pattaya Nice City Blog`) : (vlog.metaTitle || `${localTitle} - Pattaya Nice City Blog`)
  const seoDesc = localMetaDesc || localExcerpt || vlog.description.slice(0, 160)
  const ytId = extractYouTubeId(vlog.youtubeUrl)
  const keywords = [vlog.focusKeyword, ...vlog.tags.map(t => t.name)].filter(Boolean).join(", ")

  // OG image: use cover image if available, otherwise generate dynamic OG
  const ogImageUrl = vlog.coverImageUrl || vlog.thumbnailUrl ||
    `${siteUrl}/api/og?${new URLSearchParams({ title: localTitle, category: vlog.blogCategory?.name || "", readingTime: String(vlog.readingTime || "") }).toString()}`

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: keywords || undefined,
    openGraph: {
      title: vlog.metaTitle || localTitle,
      description: seoDesc,
      type: "article",
      publishedTime: vlog.publishedAt?.toISOString(),
      modifiedTime: (vlog.lastModifiedAt || vlog.updatedAt).toISOString(),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: vlog.coverImageAlt || localTitle }],
      ...(ytId ? { videos: [{ url: `https://www.youtube.com/embed/${ytId}`, width: 1280, height: 720, type: "text/html" }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: vlog.metaTitle || localTitle,
      description: seoDesc,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/vlogs/${vlog.canonicalSlug || slug}`,
    },
  }
}

export default async function VlogPage({ params }: VlogPageProps) {
  const { slug } = await params
  const locale = await getLocale()

  const vlog = await prisma.vlog.findUnique({
    where: { slug },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      tags: { select: { name: true, slug: true } },
      media: { orderBy: { order: "asc" } },
      blogCategory: { select: { name: true, slug: true, color: true } },
    },
  })

  // Slug redirect: if article not found, check for 301 redirect
  if (!vlog || !vlog.isPublished) {
    try {
      const redirect = await prisma.slugRedirect.findUnique({ where: { oldSlug: slug } })
      if (redirect) permanentRedirect(`/vlogs/${redirect.newSlug}`)
    } catch {
      // SlugRedirect table may not exist yet - ignore
    }
    notFound()
  }

  // Fire & forget view increment
  incrementVlogViews(slug)

  // Locale-aware translations (title, excerpt override)
  const trans = (vlog.translations as Record<string, any>)?.[locale]
  const localTitle = trans?.title || vlog.title
  const localExcerpt = trans?.excerpt || vlog.excerpt

  const ytId = extractYouTubeId(vlog.youtubeUrl)
  const coverImg = vlog.coverImageUrl || vlog.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined)
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"
  const displayDate = vlog.publishedAt || vlog.createdAt
  const modifiedDate = vlog.lastModifiedAt || vlog.updatedAt
  const displayContent = vlog.content || vlog.description
  const faqs = (vlog.faqs as Array<{ question: string; answer: string }>) || []
  const sources = (vlog.sources as Array<{ title: string; url?: string; date?: string }>) || []
  const terrainProofs = (vlog.terrainProof as Array<{ type: string; url: string; caption: string; date: string; location: string }>) || []
  const headings = extractHeadings(displayContent)
  const localeStr = locale === "en" ? "en-US" : locale
  const lastVerifiedAt = vlog.lastVerifiedAt

  // JSON-LD structured data
  const vlogForJsonLd: VlogForJsonLd = {
    title: vlog.title,
    slug: vlog.slug,
    excerpt: vlog.excerpt,
    content: vlog.content,
    description: vlog.description,
    metaTitle: vlog.metaTitle,
    metaDescription: vlog.metaDescription,
    focusKeyword: vlog.focusKeyword,
    coverImageUrl: vlog.coverImageUrl,
    coverImageAlt: vlog.coverImageAlt,
    articleType: vlog.articleType,
    publishedAt: vlog.publishedAt,
    lastModifiedAt: vlog.lastModifiedAt,
    lastVerifiedAt: vlog.lastVerifiedAt,
    updatedAt: vlog.updatedAt,
    createdAt: vlog.createdAt,
    readingTime: vlog.readingTime,
    youtubeUrl: vlog.youtubeUrl,
    faqs,
    sources,
    terrainProof: terrainProofs,
    media: vlog.media.map(m => ({ url: m.url, alt: m.alt, caption: m.caption })),
    author: vlog.author,
    tags: vlog.tags,
    blogCategory: vlog.blogCategory,
  }
  const articleJsonLd = buildArticleJsonLd(vlogForJsonLd, siteUrl, locale)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(vlogForJsonLd, siteUrl)
  const faqJsonLd = buildFaqJsonLd(faqs)
  const howToJsonLd = buildHowToJsonLd(vlogForJsonLd, siteUrl)

  return (
    <>
      <Script id="article-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Script id="breadcrumb-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <Script id="faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      {howToJsonLd && <Script id="howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />}

      <article className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-end">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-[#e8a840] transition-colors hidden sm:inline">Home</Link>
            <ChevronRight className="h-3 w-3 hidden sm:block" />
            <Link href="/vlogs" className="hover:text-[#e8a840] transition-colors">Blog</Link>
            {vlog.blogCategory && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/vlogs/category/${vlog.blogCategory.slug}`} className="hover:text-[#e8a840] transition-colors">
                  {vlog.blogCategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/70 truncate max-w-[200px]">{localTitle}</span>
          </nav>
        </div>

        {/* Last verified on-site badge */}
        {lastVerifiedAt && (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5">
            <Shield className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-xs text-green-300 font-medium">
              Last verified on-site: {lastVerifiedAt.toLocaleDateString(localeStr, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        )}

        {/* Cover image */}
        {coverImg && (
          <figure className="rounded-2xl border satine-border overflow-hidden relative aspect-[2/1]">
            <Image
              src={coverImg}
              alt={vlog.coverImageAlt || localTitle}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
            {vlog.coverImageCaption && (
              <figcaption className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-4 py-2">
                <p className="text-xs text-white/80 italic">{vlog.coverImageCaption}</p>
              </figcaption>
            )}
          </figure>
        )}

        {/* YouTube embed */}
        {ytId && (
          <div className="rounded-2xl border satine-border overflow-hidden bg-black">
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                title={localTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Article header */}
        <header className="rounded-2xl border satine-border bg-card p-6 space-y-4">
          {/* Category + Tags */}
          <div className="flex flex-wrap gap-2">
            {vlog.blogCategory && (
              <Link
                href={`/vlogs/category/${vlog.blogCategory.slug}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80"
                style={{ backgroundColor: `${vlog.blogCategory.color}20`, borderColor: `${vlog.blogCategory.color}40`, color: vlog.blogCategory.color }}
              >
                {vlog.blogCategory.name}
              </Link>
            )}
            {vlog.tags.map(tag => (
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

          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{localTitle}</h1>

          {/* Excerpt for speakable/SEO */}
          {localExcerpt && (
            <p className="article-excerpt text-sm text-muted-foreground leading-relaxed italic">
              {localExcerpt}
            </p>
          )}

          {/* Meta info bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
              {vlog.author.displayName || vlog.author.username}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
              {displayDate.toLocaleDateString(localeStr, { year: "numeric", month: "long", day: "numeric" })}
            </span>
            {vlog.readingTime > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
                {vlog.readingTime} min read
              </span>
            )}
            {vlog.viewCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-[rgba(232,168,64,0.60)]" />
                {vlog.viewCount.toLocaleString()} views
              </span>
            )}
          </div>

          {/* Last modified for EEAT */}
          {modifiedDate > displayDate && (
            <p className="text-xs text-muted-foreground/70 italic">
              Last updated: {modifiedDate.toLocaleDateString(localeStr, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </header>

        {/* Table of Contents */}
        {headings.length >= 3 && <TableOfContents headings={headings} />}

        {/* Article body - Markdown */}
        <div className="rounded-2xl border satine-border bg-card p-6 md:p-8">
          <MarkdownContent content={displayContent} />
        </div>

        {/* Article photos gallery */}
        {vlog.media && vlog.media.length > 0 && (
          <div className="rounded-2xl border satine-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-bold">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vlog.media.map((img) => (
                <figure key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <Image src={img.url} alt={img.alt || localTitle} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                  {img.caption && (
                    <figcaption className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white/90 truncate">{img.caption}</p>
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Field Notes & Terrain Proof - EEAT */}
        {(vlog.fieldNotes || terrainProofs.length > 0) && (
          <section className="rounded-2xl border border-[rgba(232,168,64,0.20)] bg-card p-6 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 text-[#e8a840]">
              <MapPin className="h-4 w-4" /> Field Notes & On-Site Proof
            </h2>

            {vlog.fieldNotes && (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line italic">
                {vlog.fieldNotes}
              </p>
            )}

            {/* Terrain proof gallery */}
            {terrainProofs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Proof Gallery
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {terrainProofs.filter(p => p.url).map((proof, i) => (
                    <figure key={i} className="relative aspect-video rounded-lg overflow-hidden border border-[rgba(232,168,64,0.15)]">
                      <Image src={proof.url} alt={proof.caption || `Proof ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                      <figcaption className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-2 py-1.5">
                        <p className="text-xs text-white/90 truncate">{proof.caption}</p>
                        <p className="text-xs text-white/50">
                          {proof.location && <span>{proof.location}</span>}
                          {proof.date && <span>{proof.location ? " - " : ""}{proof.date}</span>}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section className="rounded-2xl border satine-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">FAQ</span>
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="group rounded-lg border border-border/40 overflow-hidden">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[rgba(224,120,80,0.05)] transition-colors">
                    <h3 className="font-semibold text-sm text-foreground pr-4">{faq.question}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Sources & References */}
        {sources.length > 0 && (
          <section className="rounded-2xl border satine-border bg-card p-6 space-y-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Sources & References</h2>
            <ul className="space-y-1">
              {sources.map((src, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-[#e07850] shrink-0">{i + 1}.</span>
                  <span>
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[#3db8a0] hover:text-[#e8a840] transition-colors inline-flex items-center gap-1">
                        {src.title} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{src.title}</span>
                    )}
                    {src.date && <span className="text-muted-foreground/60 ml-1">({src.date})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Enhanced Author box for EEAT - Person + Organization */}
        <aside className="rounded-2xl border satine-border bg-card p-6">
          <div className="flex items-start gap-4" itemScope itemType="https://schema.org/Person">
            {vlog.author.avatarUrl ? (
              <Image
                src={vlog.author.avatarUrl}
                alt={vlog.author.displayName || vlog.author.username}
                width={56}
                height={56}
                className="rounded-full shrink-0 border-2 border-[rgba(232,168,64,0.30)]"
                itemProp="image"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#e8a840] to-[#e07850] flex items-center justify-center text-white font-bold text-xl shrink-0">
                P
              </div>
            )}
            <div className="space-y-1.5">
              <p className="font-semibold text-sm" itemProp="name">Pattaya Nice City Team</p>
              <p className="text-xs text-muted-foreground" itemProp="jobTitle">Nightlife Correspondents - Pattaya, Thailand</p>
              <p className="text-xs text-muted-foreground leading-relaxed" itemProp="description">
                A team of Pattaya-based expats and regular visitors who document the guide scene with
                first-hand observations, real prices paid on-site, and honest reviews. We visit every venue
                we write about - no desk research, no paid placements.
              </p>
              <div className="flex items-center gap-3 pt-1" itemProp="worksFor" itemScope itemType="https://schema.org/Organization">
                <meta itemProp="name" content="Pattaya Nice City" />
                <meta itemProp="url" content={siteUrl} />
                <Link href="/about" className="text-xs text-[#e8a840] hover:text-[#3db8a0] transition-colors font-medium" rel="author" itemProp="sameAs">
                  About us
                </Link>
                <Link href="/contact" className="text-xs text-muted-foreground hover:text-[#3db8a0] transition-colors">
                  Contact
                </Link>
                <Link href="/vlogs" className="text-xs text-muted-foreground hover:text-[#3db8a0] transition-colors">
                  All articles
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Related Articles */}
        <RelatedArticles
          currentVlogId={vlog.id}
          tagSlugs={vlog.tags.map(t => t.slug)}
          blogCategoryId={vlog.blogCategoryId}
        />

      </article>
    </>
  )
}
