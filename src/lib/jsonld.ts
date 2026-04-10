// Centralized JSON-LD structured data builders for blog SEO

export interface VlogForJsonLd {
  title: string
  slug: string
  excerpt: string
  content: string
  description: string
  metaTitle?: string | null
  metaDescription?: string | null
  focusKeyword?: string | null
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  articleType: string
  publishedAt?: Date | null
  lastModifiedAt?: Date | null
  lastVerifiedAt?: Date | null
  updatedAt: Date
  createdAt: Date
  readingTime: number
  faqs?: Array<{ question: string; answer: string }> | null
  sources?: Array<{ title: string; url?: string; date?: string }> | null
  terrainProof?: Array<{ type: string; url: string; caption: string; date: string; location: string }> | null
  youtubeUrl?: string
  media?: Array<{ url: string; alt?: string; caption?: string }>
  author?: { username: string; displayName?: string | null; avatarUrl?: string | null }
  tags?: Array<{ name: string; slug: string }>
  blogCategory?: { name: string; slug: string } | null
}

const ORGANIZATION = {
  "@type": "Organization" as const,
  name: "Pattaya Nice City",
  url: "",
  logo: { "@type": "ImageObject" as const, url: "" },
}

const AUTHOR_PERSON = {
  "@type": "Person" as const,
  name: "Pattaya Nice City Team",
  url: "",
  jobTitle: "Pattaya Guide Writer",
  knowsAbout: ["Pattaya restaurants", "Thailand tourism", "Pattaya beaches", "Pattaya activities"],
}

export function buildArticleJsonLd(vlog: VlogForJsonLd, siteUrl: string, locale = "en") {
  const articleUrl = `${siteUrl}/vlogs/${vlog.slug}`
  const displayDate = vlog.publishedAt || vlog.createdAt
  const modifiedDate = vlog.lastModifiedAt || vlog.updatedAt
  const desc = (vlog.metaDescription || vlog.excerpt || vlog.description).slice(0, 300)
  const wordCount = (vlog.content || vlog.description).split(/\s+/).filter(Boolean).length

  // Build ImageObject array for images
  const imageObjects: Record<string, unknown>[] = []
  const pattayaLocation = { "@type": "Place", name: "Pattaya, Thailand" }

  const imgDateCreated = (vlog.publishedAt || vlog.createdAt).toISOString()

  if (vlog.coverImageUrl) {
    imageObjects.push({
      "@type": "ImageObject",
      url: vlog.coverImageUrl,
      description: vlog.coverImageAlt || vlog.title,
      width: 1200,
      height: 630,
      dateCreated: imgDateCreated,
      contentLocation: pattayaLocation,
      author: { "@type": "Organization", name: "Pattaya Nice City", url: siteUrl },
    })
  }
  if (vlog.media) {
    for (const m of vlog.media) {
      imageObjects.push({
        "@type": "ImageObject",
        url: m.url,
        description: m.alt || m.caption || vlog.title,
        dateCreated: imgDateCreated,
        contentLocation: pattayaLocation,
        author: { "@type": "Organization", name: "Pattaya Nice City", url: siteUrl },
      })
    }
  }
  // Terrain proof photos as ImageObject
  if (vlog.terrainProof) {
    for (const proof of vlog.terrainProof) {
      if (proof.url && proof.type === "photo") {
        imageObjects.push({
          "@type": "ImageObject",
          url: proof.url,
          description: proof.caption || `On-site proof at ${proof.location}`,
          ...(proof.date ? { dateCreated: proof.date } : {}),
          contentLocation: proof.location ? { "@type": "Place", name: proof.location } : undefined,
        })
      }
    }
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: vlog.title,
    description: desc,
    url: articleUrl,
    image: imageObjects.length > 0 ? imageObjects : undefined,
    datePublished: displayDate.toISOString(),
    dateModified: modifiedDate.toISOString(),
    author: {
      ...AUTHOR_PERSON,
      url: `${siteUrl}/about`,
    },
    publisher: {
      ...ORGANIZATION,
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo_hot.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    wordCount,
    inLanguage: locale,
    isAccessibleForFree: true,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["article h1", ".article-excerpt"],
    },
  }

  // lastReviewed from lastVerifiedAt (EEAT signal)
  if (vlog.lastVerifiedAt) {
    jsonLd.lastReviewed = vlog.lastVerifiedAt.toISOString()
    jsonLd.reviewedBy = { ...AUTHOR_PERSON, url: `${siteUrl}/about` }
  }

  if (vlog.focusKeyword) jsonLd.keywords = vlog.focusKeyword
  if (vlog.tags && vlog.tags.length > 0) {
    jsonLd.about = vlog.tags.map(t => ({ "@type": "Thing", name: t.name }))
  }

  // Citations from sources for EEAT
  if (vlog.sources && vlog.sources.length > 0) {
    jsonLd.citation = vlog.sources.map(s => ({
      "@type": "CreativeWork",
      name: s.title,
      ...(s.url ? { url: s.url } : {}),
      ...(s.date ? { datePublished: s.date } : {}),
    }))
  }

  // YouTube video embed
  if (vlog.youtubeUrl) {
    const ytId = extractYtId(vlog.youtubeUrl)
    if (ytId) {
      jsonLd.video = {
        "@type": "VideoObject",
        name: vlog.title,
        embedUrl: `https://www.youtube.com/embed/${ytId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      }
    }
  }

  return jsonLd
}

export function buildHowToJsonLd(vlog: VlogForJsonLd, siteUrl: string) {
  if (vlog.articleType !== "howto") return null

  const stepRegex = /^##\s+(?:Step\s+\d+[:\s]*|(\d+)\.\s*)(.*)/gm
  const steps: Array<{ name: string; text: string }> = []
  const lines = vlog.content.split("\n")
  let currentStep: { name: string; lines: string[] } | null = null

  for (const line of lines) {
    const match = line.match(/^##\s+(?:Step\s+\d+[:\s]*|\d+\.\s*)(.*)/)
    if (match) {
      if (currentStep) steps.push({ name: currentStep.name, text: currentStep.lines.join(" ").trim() })
      currentStep = { name: match[1].trim(), lines: [] }
    } else if (currentStep && line.trim()) {
      currentStep.lines.push(line.replace(/^[#*\->\s]+/, "").trim())
    }
  }
  if (currentStep) steps.push({ name: currentStep.name, text: currentStep.lines.join(" ").trim() })

  if (steps.length === 0) return null

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: vlog.title,
    description: (vlog.metaDescription || vlog.excerpt || vlog.description).slice(0, 300),
    image: vlog.coverImageUrl || undefined,
    totalTime: `PT${vlog.readingTime}M`,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text.slice(0, 500),
    })),
  }
}

export function buildBreadcrumbJsonLd(vlog: VlogForJsonLd, siteUrl: string) {
  const items = [
    { "@type": "ListItem" as const, position: 1, name: "Home", item: siteUrl },
    { "@type": "ListItem" as const, position: 2, name: "Blog", item: `${siteUrl}/vlogs` },
  ]

  if (vlog.blogCategory) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: vlog.blogCategory.name,
      item: `${siteUrl}/vlogs/category/${vlog.blogCategory.slug}`,
    })
    items.push({
      "@type": "ListItem",
      position: 4,
      name: vlog.title,
      item: `${siteUrl}/vlogs/${vlog.slug}`,
    })
  } else {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: vlog.title,
      item: `${siteUrl}/vlogs/${vlog.slug}`,
    })
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  }
}

export function buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export function buildImageObjectJsonLd(images: Array<{ url: string; alt?: string; caption?: string }>, siteUrl: string) {
  if (!images || images.length === 0) return null
  return images.map(img => ({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: img.url,
    description: img.alt || img.caption || "",
    caption: img.caption || img.alt || "",
    author: {
      "@type": "Organization",
      name: "Pattaya Nice City",
      url: siteUrl,
    },
  }))
}

/**
 * WebPage schema for main pages (homepage, blog listing, about, members, etc.)
 */
export function buildWebPageJsonLd(params: {
  title: string
  description: string
  url: string
  siteUrl: string
  type?: string
  dateModified?: string
  locale?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": params.type || "WebPage",
    name: params.title,
    description: params.description,
    url: params.url,
    isPartOf: {
      "@type": "WebSite",
      name: "Pattaya Nice City",
      url: params.siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Pattaya Nice City",
      url: params.siteUrl,
      logo: { "@type": "ImageObject", url: `${params.siteUrl}/logo_hot.jpg` },
    },
    inLanguage: params.locale || "en",
    ...(params.dateModified ? { dateModified: params.dateModified } : {}),
  }
}

function extractYtId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
