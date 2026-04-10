import { describe, it, expect } from "vitest"
import { calculateReadabilityScore, calculateKeywordDensity, analyzeSeo } from "../seo-utils"

describe("calculateReadabilityScore", () => {
  it("returns 0 for empty content", () => {
    expect(calculateReadabilityScore("")).toBe(0)
  })

  it("returns 0 for whitespace-only content", () => {
    expect(calculateReadabilityScore("   ")).toBe(0)
  })

  it("returns high score for simple sentences", () => {
    const simple = "The cat sat on the mat. The dog ran in the park. It was a good day."
    const score = calculateReadabilityScore(simple)
    expect(score).toBeGreaterThan(70)
  })

  it("returns lower score for complex academic text", () => {
    const complex =
      "The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of computational complexity. Furthermore, the extrapolation of theoretical frameworks requires meticulous consideration of multifaceted parameters."
    const score = calculateReadabilityScore(complex)
    expect(score).toBeLessThan(40)
  })

  it("strips markdown before analyzing", () => {
    const md = "## Hello World\n\nThis is a **bold** and *italic* sentence. [Click here](http://example.com) for more."
    const score = calculateReadabilityScore(md)
    expect(score).toBeGreaterThan(0)
  })

  it("clamps score between 0 and 100", () => {
    const score = calculateReadabilityScore("Hi. Go. Run. Fun. Yes. No.")
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe("calculateKeywordDensity", () => {
  it("returns zeros for empty keyword", () => {
    const result = calculateKeywordDensity("Some text here", "")
    expect(result).toEqual({ keyword: "", density: 0, count: 0, totalWords: 0 })
  })

  it("returns zeros for empty content", () => {
    const result = calculateKeywordDensity("", "keyword")
    expect(result).toEqual({ keyword: "keyword", density: 0, count: 0, totalWords: 0 })
  })

  it("counts single keyword occurrences", () => {
    const text = "Pattaya nightlife is great. The Pattaya scene is amazing. Pattaya rocks."
    const result = calculateKeywordDensity(text, "Pattaya")
    expect(result.count).toBe(3)
    expect(result.keyword).toBe("pattaya")
    expect(result.totalWords).toBeGreaterThan(0)
    expect(result.density).toBeGreaterThan(0)
  })

  it("handles multi-word keywords", () => {
    const text = "Walking Street is famous. You should visit Walking Street at night. Walking Street bars are open."
    const result = calculateKeywordDensity(text, "Walking Street")
    expect(result.count).toBe(3)
  })

  it("is case-insensitive", () => {
    const text = "PATTAYA is great. pattaya is cool. Pattaya rocks."
    const result = calculateKeywordDensity(text, "pattaya")
    expect(result.count).toBe(3)
  })

  it("strips markdown syntax before counting", () => {
    const md = "## Pattaya Guide\n\nVisit **Pattaya** for the best nightlife. [Pattaya](http://example.com) is fun."
    const result = calculateKeywordDensity(md, "Pattaya")
    expect(result.count).toBeGreaterThanOrEqual(3)
  })

  it("handles whitespace-only keyword", () => {
    const result = calculateKeywordDensity("some text", "   ")
    expect(result.density).toBe(0)
  })
})

describe("analyzeSeo", () => {
  const baseParams = {
    title: "Best GoGo Bars in Pattaya - The Ultimate Guide 2024",
    metaTitle: "Best GoGo Bars in Pattaya - The Ultimate Guide 2024",
    metaDescription: "Discover the best GoGo bars in Pattaya. Our comprehensive guide covers Walking Street, Soi 6, and more. Find reviews, prices, and insider tips for Pattaya nightlife.",
    content: "## Introduction\n\n" + "This is a comprehensive guide to GoGo bars in Pattaya. ".repeat(100) + "\n\n## Best Bars\n\n" + "Walking Street has the best selection of bars. ".repeat(50) + "\n\n## Prices\n\n" + "Lady drinks cost around 150 baht. ".repeat(50) + "\n\n## Tips\n\nAlways check the bill.",
    focusKeyword: "GoGo bars in Pattaya",
    excerpt: "Discover the best GoGo bars in Pattaya with our comprehensive guide covering Walking Street, Soi 6, and all the top nightlife spots.",
  }

  it("returns an array of SEO checks", () => {
    const results = analyzeSeo(baseParams)
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it("each check has required fields", () => {
    const results = analyzeSeo(baseParams)
    for (const check of results) {
      expect(check).toHaveProperty("label")
      expect(check).toHaveProperty("status")
      expect(check).toHaveProperty("detail")
      expect(["good", "warning", "bad"]).toContain(check.status)
    }
  })

  it("flags bad title when too short", () => {
    const results = analyzeSeo({ ...baseParams, title: "Hi", metaTitle: "Hi" })
    const titleCheck = results.find((c) => c.label === "Title length")
    expect(titleCheck?.status).toBe("bad")
  })

  it("flags good title in ideal range", () => {
    const results = analyzeSeo(baseParams)
    const titleCheck = results.find((c) => c.label === "Title length")
    expect(titleCheck?.status).toBe("good")
  })

  it("flags missing focus keyword", () => {
    const results = analyzeSeo({ ...baseParams, focusKeyword: "" })
    const kwCheck = results.find((c) => c.label === "Focus keyword")
    expect(kwCheck?.status).toBe("bad")
  })

  it("flags bad meta description when empty", () => {
    const results = analyzeSeo({ ...baseParams, metaDescription: "", excerpt: "" })
    const descCheck = results.find((c) => c.label === "Meta description")
    expect(descCheck?.status).toBe("bad")
  })

  it("detects keyword in title", () => {
    const results = analyzeSeo(baseParams)
    const kwTitle = results.find((c) => c.label === "Keyword in title")
    expect(kwTitle?.status).toBe("good")
  })

  it("detects keyword missing from title", () => {
    const results = analyzeSeo({ ...baseParams, title: "Nightlife Guide", focusKeyword: "Walking Street" })
    const kwTitle = results.find((c) => c.label === "Keyword in title")
    expect(kwTitle?.status).toBe("bad")
  })

  it("counts H2 headings", () => {
    const results = analyzeSeo(baseParams)
    const headings = results.find((c) => c.label === "Subheadings")
    expect(headings?.status).toBe("good")
  })

  it("flags no H2 headings", () => {
    const results = analyzeSeo({ ...baseParams, content: "Just some text without any headings at all. ".repeat(50) })
    const headings = results.find((c) => c.label === "Subheadings")
    expect(headings?.status).toBe("bad")
  })

  it("checks excerpt length", () => {
    const results = analyzeSeo(baseParams)
    const excerpt = results.find((c) => c.label === "Excerpt")
    expect(excerpt?.status).toBe("good")
  })

  it("checks content images", () => {
    const results = analyzeSeo(baseParams)
    const images = results.find((c) => c.label === "Content images")
    expect(images).toBeDefined()
  })

  it("detects external links", () => {
    const withExternal = { ...baseParams, content: baseParams.content + "\n[Source](https://example.com)" }
    const results = analyzeSeo(withExternal)
    const ext = results.find((c) => c.label === "External links")
    expect(ext?.status).toBe("good")
  })
})
