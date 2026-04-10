import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

// Map locale codes to BCP-47 hreflang codes for sitemap alternates
const hreflangMap: Record<Locale, string> = {
  en: "en",
  fr: "fr",
  es: "es",
  zh: "zh-Hans",
  ko: "ko",
  ja: "ja",
  de: "de",
  yue: "zh-Hant-HK",
  th: "th",
  ru: "ru",
  ar: "ar",
  hi: "hi",
}

function buildAlternates(path: string, baseUrl: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    const hreflang = hreflangMap[locale]
    languages[hreflang] =
      locale === defaultLocale
        ? `${baseUrl}${path}`
        : `${baseUrl}/${locale}${path}`
  }
  // x-default → default locale URL
  languages["x-default"] = `${baseUrl}${path}`
  return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pattayanicecity.com'

  const [posts, venues, categories, vlogs] = await Promise.all([
    prisma.post.findMany({ where: { deletedAt: null }, select: { slug: true, updatedAt: true }, orderBy: { createdAt: 'desc' } }),
    prisma.venue.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.vlog.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true, publishedAt: true, viewCount: true }, orderBy: { publishedAt: 'desc' } }),
  ])

  // BlogCategory/BlogTag may not exist yet during initial migration
  let blogCategories: Array<{ slug: string }> = []
  let blogTags: Array<{ slug: string }> = []
  try {
    blogCategories = await prisma.blogCategory.findMany({ select: { slug: true } })
    blogTags = await prisma.blogTag.findMany({ select: { slug: true } })
  } catch {}

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/post/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: buildAlternates(`/post/${post.slug}`, baseUrl),
  }))

  const venueUrls = venues.map((venue) => ({
    url: `${baseUrl}/places/${venue.slug}`,
    lastModified: venue.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
    alternates: buildAlternates(`/places/${venue.slug}`, baseUrl),
  }))

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const vlogUrls = vlogs.map((vlog) => {
    const isRecent = vlog.publishedAt && vlog.publishedAt > thirtyDaysAgo
    return {
      url: `${baseUrl}/vlogs/${vlog.slug}`,
      lastModified: vlog.updatedAt,
      changeFrequency: (isRecent ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      priority: vlog.viewCount > 100 ? 0.9 : 0.8,
      alternates: buildAlternates(`/vlogs/${vlog.slug}`, baseUrl),
    }
  })

  const blogCategoryUrls = blogCategories.map((cat) => ({
    url: `${baseUrl}/vlogs/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    alternates: buildAlternates(`/vlogs/category/${cat.slug}`, baseUrl),
  }))

  const blogTagUrls = blogTags.map((tag) => ({
    url: `${baseUrl}/vlogs/tag/${tag.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
    alternates: buildAlternates(`/vlogs/tag/${tag.slug}`, baseUrl),
  }))

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/?category=${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
    alternates: buildAlternates(`/?category=${cat.slug}`, baseUrl),
  }))

  return [
    { url: baseUrl,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0, alternates: buildAlternates('/', baseUrl) },
    { url: `${baseUrl}/community`,         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9, alternates: buildAlternates('/community', baseUrl) },
    { url: `${baseUrl}/vlogs`,             lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9, alternates: buildAlternates('/vlogs', baseUrl) },
    { url: `${baseUrl}/about`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: buildAlternates('/about', baseUrl) },
    { url: `${baseUrl}/legal`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3, alternates: buildAlternates('/legal', baseUrl) },
    { url: `${baseUrl}/register`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: buildAlternates('/register', baseUrl) },
    ...categoryUrls,
    ...venueUrls,
    ...vlogUrls,
    ...blogCategoryUrls,
    ...blogTagUrls,
    ...postUrls,
  ]
}
