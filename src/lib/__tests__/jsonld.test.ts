import { describe, it, expect } from "vitest"
import {
  buildArticleJsonLd,
  buildHowToJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildImageObjectJsonLd,
  buildWebPageJsonLd,
  type VlogForJsonLd,
} from "../jsonld"

const siteUrl = "https://pattayavicecity.com"

function makeVlog(overrides: Partial<VlogForJsonLd> = {}): VlogForJsonLd {
  return {
    title: "Best GoGo Bars in Pattaya",
    slug: "best-gogo-bars-pattaya",
    excerpt: "Discover the best GoGo bars on Walking Street.",
    content: "## Introduction\n\nThis is a guide to GoGo bars.",
    description: "A guide to GoGo bars in Pattaya.",
    articleType: "guide",
    createdAt: new Date("2024-06-01T12:00:00Z"),
    updatedAt: new Date("2024-06-15T12:00:00Z"),
    readingTime: 8,
    ...overrides,
  }
}

describe("buildArticleJsonLd", () => {
  it("returns Article schema with required fields", () => {
    const jsonLd = buildArticleJsonLd(makeVlog(), siteUrl)
    expect(jsonLd["@context"]).toBe("https://schema.org")
    expect(jsonLd["@type"]).toBe("Article")
    expect(jsonLd.headline).toBe("Best GoGo Bars in Pattaya")
    expect(jsonLd.url).toBe(`${siteUrl}/vlogs/best-gogo-bars-pattaya`)
  })

  it("uses metaDescription over excerpt when available", () => {
    const vlog = makeVlog({ metaDescription: "Custom meta description." })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.description).toBe("Custom meta description.")
  })

  it("uses publishedAt for datePublished when available", () => {
    const pub = new Date("2024-05-01T10:00:00Z")
    const vlog = makeVlog({ publishedAt: pub })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.datePublished).toBe(pub.toISOString())
  })

  it("falls back to createdAt for datePublished", () => {
    const vlog = makeVlog()
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.datePublished).toBe(vlog.createdAt.toISOString())
  })

  it("includes cover image as ImageObject", () => {
    const vlog = makeVlog({ coverImageUrl: "https://cdn.example.com/cover.jpg" })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.image).toBeDefined()
    const images = jsonLd.image as any[]
    expect(images[0]["@type"]).toBe("ImageObject")
    expect(images[0].url).toBe("https://cdn.example.com/cover.jpg")
    expect(images[0].dateCreated).toBeDefined()
    expect(images[0].contentLocation).toBeDefined()
  })

  it("includes media images", () => {
    const vlog = makeVlog({
      coverImageUrl: "https://cdn.example.com/cover.jpg",
      media: [
        { url: "https://cdn.example.com/img1.jpg", alt: "Image 1" },
        { url: "https://cdn.example.com/img2.jpg", alt: "Image 2" },
      ],
    })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    const images = jsonLd.image as any[]
    expect(images).toHaveLength(3) // cover + 2 media
  })

  it("includes lastReviewed when lastVerifiedAt is set", () => {
    const verified = new Date("2024-06-10T08:00:00Z")
    const vlog = makeVlog({ lastVerifiedAt: verified })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.lastReviewed).toBe(verified.toISOString())
    expect(jsonLd.reviewedBy).toBeDefined()
  })

  it("does not include lastReviewed when lastVerifiedAt is null", () => {
    const vlog = makeVlog({ lastVerifiedAt: undefined })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.lastReviewed).toBeUndefined()
  })

  it("includes focusKeyword as keywords", () => {
    const vlog = makeVlog({ focusKeyword: "gogo bars pattaya" })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.keywords).toBe("gogo bars pattaya")
  })

  it("includes tags as about", () => {
    const vlog = makeVlog({ tags: [{ name: "Nightlife", slug: "nightlife" }] })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.about).toBeDefined()
    expect((jsonLd.about as any[])[0].name).toBe("Nightlife")
  })

  it("includes sources as citation", () => {
    const vlog = makeVlog({
      sources: [{ title: "Thai Tourism Report", url: "https://example.com/report", date: "2024-01-01" }],
    })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.citation).toBeDefined()
    expect((jsonLd.citation as any[])[0].name).toBe("Thai Tourism Report")
  })

  it("includes YouTube video when youtubeUrl is set", () => {
    const vlog = makeVlog({ youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
    const jsonLd = buildArticleJsonLd(vlog, siteUrl)
    expect(jsonLd.video).toBeDefined()
    expect((jsonLd.video as any).embedUrl).toContain("dQw4w9WgXcQ")
  })

  it("sets inLanguage from locale param", () => {
    const jsonLd = buildArticleJsonLd(makeVlog(), siteUrl, "fr")
    expect(jsonLd.inLanguage).toBe("fr")
  })
})

describe("buildHowToJsonLd", () => {
  it("returns null for non-howto article type", () => {
    const vlog = makeVlog({ articleType: "guide" })
    expect(buildHowToJsonLd(vlog, siteUrl)).toBeNull()
  })

  it("returns null for howto with no steps", () => {
    const vlog = makeVlog({ articleType: "howto", content: "Just a regular paragraph." })
    expect(buildHowToJsonLd(vlog, siteUrl)).toBeNull()
  })

  it("extracts HowTo steps from content", () => {
    const content = "## Step 1: Find a Bar\n\nLook around Walking Street.\n\n## Step 2: Enter\n\nJust walk in."
    const vlog = makeVlog({ articleType: "howto", content })
    const result = buildHowToJsonLd(vlog, siteUrl)
    expect(result).not.toBeNull()
    expect(result!["@type"]).toBe("HowTo")
    expect(result!.step).toHaveLength(2)
    expect((result!.step as any[])[0].name).toBe("Find a Bar")
    expect((result!.step as any[])[0].position).toBe(1)
  })

  it("includes totalTime based on readingTime", () => {
    const content = "## Step 1: Do this\n\nDo it."
    const vlog = makeVlog({ articleType: "howto", content, readingTime: 12 })
    const result = buildHowToJsonLd(vlog, siteUrl)
    expect(result!.totalTime).toBe("PT12M")
  })
})

describe("buildBreadcrumbJsonLd", () => {
  it("returns BreadcrumbList schema", () => {
    const vlog = makeVlog()
    const result = buildBreadcrumbJsonLd(vlog, siteUrl)
    expect(result["@type"]).toBe("BreadcrumbList")
    expect(result.itemListElement).toBeDefined()
  })

  it("has Home and Blog as first items", () => {
    const vlog = makeVlog()
    const items = buildBreadcrumbJsonLd(vlog, siteUrl).itemListElement
    expect(items[0].name).toBe("Home")
    expect(items[1].name).toBe("Blog")
  })

  it("includes category when present", () => {
    const vlog = makeVlog({ blogCategory: { name: "Nightlife", slug: "nightlife" } })
    const items = buildBreadcrumbJsonLd(vlog, siteUrl).itemListElement
    expect(items).toHaveLength(4)
    expect(items[2].name).toBe("Nightlife")
    expect(items[3].name).toBe("Best GoGo Bars in Pattaya")
  })

  it("skips category when not present", () => {
    const vlog = makeVlog({ blogCategory: null })
    const items = buildBreadcrumbJsonLd(vlog, siteUrl).itemListElement
    expect(items).toHaveLength(3)
    expect(items[2].name).toBe("Best GoGo Bars in Pattaya")
  })
})

describe("buildFaqJsonLd", () => {
  it("returns null for empty faqs", () => {
    expect(buildFaqJsonLd([])).toBeNull()
  })

  it("returns null for undefined faqs", () => {
    expect(buildFaqJsonLd(undefined as any)).toBeNull()
  })

  it("builds FAQPage schema", () => {
    const faqs = [
      { question: "What time do bars close?", answer: "Most close around 2-3 AM." },
      { question: "Is it safe?", answer: "Yes, generally safe." },
    ]
    const result = buildFaqJsonLd(faqs)
    expect(result!["@type"]).toBe("FAQPage")
    expect(result!.mainEntity).toHaveLength(2)
    expect((result!.mainEntity as any[])[0].name).toBe("What time do bars close?")
  })
})

describe("buildImageObjectJsonLd", () => {
  it("returns null for empty images", () => {
    expect(buildImageObjectJsonLd([], siteUrl)).toBeNull()
  })

  it("returns null for undefined images", () => {
    expect(buildImageObjectJsonLd(undefined as any, siteUrl)).toBeNull()
  })

  it("builds array of ImageObject schemas", () => {
    const images = [
      { url: "https://cdn.example.com/img1.jpg", alt: "Bar entrance" },
      { url: "https://cdn.example.com/img2.jpg", caption: "Dance floor" },
    ]
    const result = buildImageObjectJsonLd(images, siteUrl)
    expect(result).toHaveLength(2)
    expect(result![0]["@type"]).toBe("ImageObject")
    expect(result![0].description).toBe("Bar entrance")
    expect(result![1].caption).toBe("Dance floor")
  })
})

describe("buildWebPageJsonLd", () => {
  it("builds WebPage schema with required fields", () => {
    const result = buildWebPageJsonLd({
      title: "Home",
      description: "Welcome to Pattaya Vice City",
      url: siteUrl,
      siteUrl,
    })
    expect(result["@context"]).toBe("https://schema.org")
    expect(result["@type"]).toBe("WebPage")
    expect(result.name).toBe("Home")
  })

  it("uses custom type when provided", () => {
    const result = buildWebPageJsonLd({
      title: "About",
      description: "About us",
      url: `${siteUrl}/about`,
      siteUrl,
      type: "AboutPage",
    })
    expect(result["@type"]).toBe("AboutPage")
  })

  it("includes dateModified when provided", () => {
    const result = buildWebPageJsonLd({
      title: "Blog",
      description: "Blog listing",
      url: `${siteUrl}/vlogs`,
      siteUrl,
      dateModified: "2024-06-15T12:00:00Z",
    })
    expect(result.dateModified).toBe("2024-06-15T12:00:00Z")
  })

  it("omits dateModified when not provided", () => {
    const result = buildWebPageJsonLd({
      title: "Home",
      description: "Home page",
      url: siteUrl,
      siteUrl,
    })
    expect(result).not.toHaveProperty("dateModified")
  })

  it("sets inLanguage from locale", () => {
    const result = buildWebPageJsonLd({
      title: "Accueil",
      description: "Bienvenue",
      url: siteUrl,
      siteUrl,
      locale: "fr",
    })
    expect(result.inLanguage).toBe("fr")
  })

  it("defaults inLanguage to 'en'", () => {
    const result = buildWebPageJsonLd({
      title: "Home",
      description: "Home page",
      url: siteUrl,
      siteUrl,
    })
    expect(result.inLanguage).toBe("en")
  })
})
