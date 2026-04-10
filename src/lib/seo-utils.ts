// SEO utility functions for readability scoring and keyword analysis

/**
 * Strip markdown syntax to get plain text for analysis
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/!\[.*?\]\(.+?\)/g, "") // images
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/^\s*[-*+]\s+/gm, "") // list markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered lists
    .replace(/^\s*>\s+/gm, "") // blockquotes
    .replace(/\|[^|]*\|/g, "") // tables
    .replace(/---+/g, "") // hr
    .replace(/@[a-zA-Z0-9_-]+/g, "") // @mentions
    .replace(/#[a-zA-Z0-9À-ÿ_]+/g, "") // #hashtags
    .trim()
}

/**
 * Count syllables in a word (English approximation)
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "")
  if (w.length <= 2) return 1

  let count = 0
  const vowels = "aeiouy"
  let prevVowel = false

  for (const char of w) {
    const isVowel = vowels.includes(char)
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }

  // Adjust for silent e
  if (w.endsWith("e") && count > 1) count--
  // Adjust for -le endings
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) count++

  return Math.max(1, count)
}

/**
 * Split text into sentences
 */
function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Get words from text
 */
function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0)
}

/**
 * Calculate Flesch-Kincaid Reading Ease score
 * Range: 0-100 (higher = easier to read)
 * 60-70 = standard, 70-80 = fairly easy, 80+ = easy
 */
export function calculateReadabilityScore(markdown: string): number {
  const text = stripMarkdown(markdown)
  const words = getWords(text)
  const sentences = getSentences(text)

  if (words.length === 0 || sentences.length === 0) return 0

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = totalSyllables / words.length

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord

  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10
}

/**
 * Calculate keyword density for a focus keyword
 */
export function calculateKeywordDensity(
  markdown: string,
  keyword: string
): { keyword: string; density: number; count: number; totalWords: number } {
  if (!keyword || !keyword.trim()) {
    return { keyword: "", density: 0, count: 0, totalWords: 0 }
  }

  const text = stripMarkdown(markdown).toLowerCase()
  const kw = keyword.toLowerCase().trim()
  const words = getWords(text)
  const totalWords = words.length

  if (totalWords === 0) return { keyword: kw, density: 0, count: 0, totalWords: 0 }

  // Count exact phrase occurrences
  let count = 0
  const textLower = text.toLowerCase()
  let pos = 0
  while ((pos = textLower.indexOf(kw, pos)) !== -1) {
    count++
    pos += kw.length
  }

  const kwWordCount = getWords(kw).length
  const density = kwWordCount > 0 ? Math.round((count * kwWordCount / totalWords) * 1000) / 10 : 0

  return { keyword: kw, density, count, totalWords }
}

/**
 * Analyze SEO quality of an article (used in admin panel)
 */
export function analyzeSeo(params: {
  title: string
  metaTitle: string
  metaDescription: string
  content: string
  focusKeyword: string
  excerpt: string
}): Array<{ label: string; status: "good" | "warning" | "bad"; detail: string }> {
  const checks: Array<{ label: string; status: "good" | "warning" | "bad"; detail: string }> = []

  // Title length
  const titleLen = (params.metaTitle || params.title).length
  if (titleLen >= 50 && titleLen <= 60) {
    checks.push({ label: "Title length", status: "good", detail: `${titleLen} chars (ideal: 50-60)` })
  } else if (titleLen >= 40 && titleLen <= 70) {
    checks.push({ label: "Title length", status: "warning", detail: `${titleLen} chars (ideal: 50-60)` })
  } else {
    checks.push({ label: "Title length", status: "bad", detail: `${titleLen} chars (ideal: 50-60)` })
  }

  // Meta description length
  const descLen = (params.metaDescription || params.excerpt).length
  if (descLen >= 120 && descLen <= 160) {
    checks.push({ label: "Meta description", status: "good", detail: `${descLen} chars (ideal: 120-160)` })
  } else if (descLen >= 80 && descLen <= 200) {
    checks.push({ label: "Meta description", status: "warning", detail: `${descLen} chars (ideal: 120-160)` })
  } else {
    checks.push({ label: "Meta description", status: "bad", detail: `${descLen} chars (ideal: 120-160)` })
  }

  // Content length
  const plainText = stripMarkdown(params.content)
  const wordCount = getWords(plainText).length
  if (wordCount >= 1500) {
    checks.push({ label: "Content length", status: "good", detail: `${wordCount} words (1500+ ideal)` })
  } else if (wordCount >= 800) {
    checks.push({ label: "Content length", status: "warning", detail: `${wordCount} words (1500+ ideal)` })
  } else {
    checks.push({ label: "Content length", status: "bad", detail: `${wordCount} words (1500+ ideal)` })
  }

  // Readability
  const readability = calculateReadabilityScore(params.content)
  if (readability >= 60) {
    checks.push({ label: "Readability", status: "good", detail: `Score: ${readability} (60+ ideal)` })
  } else if (readability >= 40) {
    checks.push({ label: "Readability", status: "warning", detail: `Score: ${readability} (60+ ideal)` })
  } else {
    checks.push({ label: "Readability", status: "bad", detail: `Score: ${readability} (60+ ideal)` })
  }

  // Keyword density
  if (params.focusKeyword) {
    const kd = calculateKeywordDensity(params.content, params.focusKeyword)
    if (kd.density >= 1 && kd.density <= 3) {
      checks.push({ label: "Keyword density", status: "good", detail: `${kd.density}% (${kd.count}x, ideal: 1-3%)` })
    } else if (kd.density > 0 && kd.density < 5) {
      checks.push({ label: "Keyword density", status: "warning", detail: `${kd.density}% (${kd.count}x, ideal: 1-3%)` })
    } else {
      checks.push({ label: "Keyword density", status: "bad", detail: `${kd.density}% (${kd.count}x, ideal: 1-3%)` })
    }

    // Keyword in title
    const titleLower = params.title.toLowerCase()
    const kwLower = params.focusKeyword.toLowerCase()
    if (titleLower.includes(kwLower)) {
      checks.push({ label: "Keyword in title", status: "good", detail: "Focus keyword found in title" })
    } else {
      checks.push({ label: "Keyword in title", status: "bad", detail: "Focus keyword missing from title" })
    }
  } else {
    checks.push({ label: "Focus keyword", status: "bad", detail: "No focus keyword set" })
  }

  // Headings check
  const h2Count = (params.content.match(/^##\s+/gm) || []).length
  if (h2Count >= 3) {
    checks.push({ label: "Subheadings", status: "good", detail: `${h2Count} H2 headings found` })
  } else if (h2Count >= 1) {
    checks.push({ label: "Subheadings", status: "warning", detail: `${h2Count} H2 headings (3+ ideal)` })
  } else {
    checks.push({ label: "Subheadings", status: "bad", detail: "No H2 headings found" })
  }

  // Internal links check
  const internalLinks = (params.content.match(/@[a-zA-Z0-9_-]+/g) || []).length +
    (params.content.match(/\]\(\/(vlogs|places|go)\//g) || []).length
  if (internalLinks >= 3) {
    checks.push({ label: "Internal links", status: "good", detail: `${internalLinks} internal links` })
  } else if (internalLinks >= 1) {
    checks.push({ label: "Internal links", status: "warning", detail: `${internalLinks} internal links (3+ ideal)` })
  } else {
    checks.push({ label: "Internal links", status: "bad", detail: "No internal links found" })
  }

  // Excerpt check
  const excerptLen = params.excerpt.length
  if (excerptLen >= 100 && excerptLen <= 300) {
    checks.push({ label: "Excerpt", status: "good", detail: `${excerptLen} chars (ideal: 100-300)` })
  } else if (excerptLen >= 50) {
    checks.push({ label: "Excerpt", status: "warning", detail: `${excerptLen} chars (ideal: 100-300)` })
  } else {
    checks.push({ label: "Excerpt", status: "bad", detail: excerptLen === 0 ? "No excerpt set" : `${excerptLen} chars (ideal: 100-300)` })
  }

  // Images in content
  const imageCount = (params.content.match(/!\[.*?\]\(.+?\)/g) || []).length
  if (imageCount >= 2) {
    checks.push({ label: "Content images", status: "good", detail: `${imageCount} images in content` })
  } else if (imageCount >= 1) {
    checks.push({ label: "Content images", status: "warning", detail: `${imageCount} image (2+ ideal)` })
  } else {
    checks.push({ label: "Content images", status: "warning", detail: "No images in content" })
  }

  // Keyword in meta description
  if (params.focusKeyword) {
    const metaLower = (params.metaDescription || params.excerpt).toLowerCase()
    if (metaLower.includes(params.focusKeyword.toLowerCase())) {
      checks.push({ label: "Keyword in description", status: "good", detail: "Focus keyword found in meta description" })
    } else {
      checks.push({ label: "Keyword in description", status: "warning", detail: "Focus keyword missing from meta description" })
    }
  }

  // External links (authority signals)
  const externalLinks = (params.content.match(/\]\(https?:\/\//g) || []).length
  if (externalLinks >= 1) {
    checks.push({ label: "External links", status: "good", detail: `${externalLinks} external link${externalLinks > 1 ? "s" : ""} (authority signal)` })
  } else {
    checks.push({ label: "External links", status: "warning", detail: "No external links (add 1+ for authority)" })
  }

  // Keyword in first paragraph
  if (params.focusKeyword && params.content) {
    const firstParagraph = params.content.split(/\n\n/)[0]?.toLowerCase() || ""
    if (firstParagraph.includes(params.focusKeyword.toLowerCase())) {
      checks.push({ label: "Keyword in intro", status: "good", detail: "Focus keyword appears in first paragraph" })
    } else {
      checks.push({ label: "Keyword in intro", status: "warning", detail: "Add focus keyword to first paragraph" })
    }
  }

  // Keyword in H2 headings
  if (params.focusKeyword && h2Count > 0) {
    const h2s = params.content.match(/^##\s+(.+)/gm) || []
    const kwInH2 = h2s.some(h => h.toLowerCase().includes(params.focusKeyword.toLowerCase()))
    if (kwInH2) {
      checks.push({ label: "Keyword in H2", status: "good", detail: "Focus keyword found in a subheading" })
    } else {
      checks.push({ label: "Keyword in H2", status: "warning", detail: "Add focus keyword to at least one H2" })
    }
  }

  return checks
}
