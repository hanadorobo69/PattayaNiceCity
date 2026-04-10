"use server"

import { revalidatePath } from "next/cache"
import { prisma, safeError } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import type { ActionResult } from "@/types"
import type { Vlog, BlogMedia } from "@prisma/client"
import { calculateReadabilityScore, calculateKeywordDensity } from "@/lib/seo-utils"

function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-")
}

function calcReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

// Auto-generate SEO meta if not provided
function autoMetaTitle(title: string): string {
  const base = `${title} - Pattaya Nice City`
  return base.length > 60 ? title.slice(0, 57) + "..." : base
}

function autoMetaDescription(excerpt: string, content: string): string {
  const raw = excerpt || content.replace(/[@#]\S+/g, "").replace(/[#*_\[\]()]/g, "")
  return raw.slice(0, 155).trim() + (raw.length > 155 ? "..." : "")
}

async function requireAdmin() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true, id: true } })
  if (!profile?.isAdmin) return null
  return profile.id
}

function getString(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? "").trim()
}

function getStringOrNull(fd: FormData, key: string): string | null {
  const v = getString(fd, key)
  return v || null
}

function parseJson<T>(fd: FormData, key: string): T | null {
  const raw = getString(fd, key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function createVlog(formData: FormData): Promise<ActionResult<Vlog>> {
  const userId = await requireAdmin()
  if (!userId) return { success: false, error: "Not authorized" }

  const title = getString(formData, "title")
  if (!title) return { success: false, error: "Title is required" }

  const excerpt = getString(formData, "excerpt")
  const content = getString(formData, "content")
  const description = excerpt || content.slice(0, 300)
  const metaTitle = getStringOrNull(formData, "metaTitle")
  const metaDescription = getStringOrNull(formData, "metaDescription")
  const focusKeyword = getStringOrNull(formData, "focusKeyword")
  const coverImageUrl = getStringOrNull(formData, "coverImageUrl")
  const coverImageAlt = getStringOrNull(formData, "coverImageAlt")
  const coverImageCaption = getStringOrNull(formData, "coverImageCaption")
  const youtubeUrl = getString(formData, "youtubeUrl")
  const thumbnailUrl = getStringOrNull(formData, "thumbnailUrl")
  const articleType = getString(formData, "articleType") || "article"
  const isPublished = formData.get("isPublished") === "on"
  const publishedAtRaw = getString(formData, "publishedAt")
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : (isPublished ? new Date() : null)
  const lastModifiedAtRaw = getString(formData, "lastModifiedAt")
  const lastModifiedAt = lastModifiedAtRaw ? new Date(lastModifiedAtRaw) : null
  const fieldNotes = getStringOrNull(formData, "fieldNotes")
  const canonicalSlug = getStringOrNull(formData, "canonicalSlug")
  const blogCategoryId = getStringOrNull(formData, "blogCategoryId")
  const lastVerifiedAtRaw = getString(formData, "lastVerifiedAt")
  const lastVerifiedAt = lastVerifiedAtRaw ? new Date(lastVerifiedAtRaw) : null
  const terrainProof = parseJson<Array<{ type: string; url: string; caption: string; date: string; location: string }>>(formData, "terrainProof")
  const translationsRaw = getString(formData, "translations")
  const translations = translationsRaw ? (() => { try { return JSON.parse(translationsRaw) as object } catch { return null } })() : null

  const faqs = parseJson<Array<{ question: string; answer: string }>>(formData, "faqs")
  const sources = parseJson<Array<{ title: string; url?: string; date?: string }>>(formData, "sources")
  const tagsRaw = getString(formData, "tags")

  const readingTime = calcReadingTime(content)
  const readabilityScore = calculateReadabilityScore(content)
  const keywordDensityData = focusKeyword ? calculateKeywordDensity(content, focusKeyword) : null

  const baseSlug = makeSlug(title)
  let slug = baseSlug
  let counter = 1
  while (await prisma.vlog.findUnique({ where: { slug } })) slug = `${baseSlug}-${counter++}`

  // Upsert tags
  const tagNames = tagsRaw.split(",").map(t => t.trim()).filter(Boolean)
  const tagConnects = []
  for (const name of tagNames) {
    const tagSlug = makeSlug(name)
    if (!tagSlug) continue
    const tag = await prisma.blogTag.upsert({
      where: { slug: tagSlug },
      create: { name, slug: tagSlug },
      update: {},
    })
    tagConnects.push({ id: tag.id })
  }

  try {
    const vlog = await prisma.vlog.create({
      data: {
        title, slug, excerpt, content, description,
        metaTitle: metaTitle || autoMetaTitle(title),
        metaDescription: metaDescription || autoMetaDescription(excerpt, content),
        focusKeyword, coverImageUrl, coverImageAlt, coverImageCaption,
        youtubeUrl, thumbnailUrl, articleType,
        isPublished, publishedAt, lastModifiedAt,
        readingTime, readabilityScore,
        keywordDensity: keywordDensityData ?? undefined,
        faqs: faqs ?? undefined, sources: sources ?? undefined,
        fieldNotes, canonicalSlug,
        lastVerifiedAt,
        terrainProof: terrainProof ?? undefined,
        translations: translations ?? undefined,
        authorId: userId,
        blogCategoryId,
        tags: { connect: tagConnects },
      },
    })
    revalidatePath("/vlogs", "page")
    revalidatePath("/vlogs", "layout")
    revalidatePath("/admin/vlogs")
    revalidatePath(`/vlogs/${slug}`)
    return { success: true, data: vlog }
  } catch (error) {
    return { success: false, error: safeError("Failed to create article", error) }
  }
}

export async function updateVlog(id: string, formData: FormData): Promise<ActionResult<Vlog>> {
  const userId = await requireAdmin()
  if (!userId) return { success: false, error: "Not authorized" }

  const vlog = await prisma.vlog.findUnique({ where: { id }, include: { tags: true } })
  if (!vlog) return { success: false, error: "Article not found" }

  const title = getString(formData, "title")
  if (!title) return { success: false, error: "Title is required" }

  const excerpt = getString(formData, "excerpt")
  const content = getString(formData, "content")
  const description = excerpt || content.slice(0, 300)
  const metaTitle = getStringOrNull(formData, "metaTitle")
  const metaDescription = getStringOrNull(formData, "metaDescription")
  const focusKeyword = getStringOrNull(formData, "focusKeyword")
  const coverImageUrl = getStringOrNull(formData, "coverImageUrl")
  const coverImageAlt = getStringOrNull(formData, "coverImageAlt")
  const coverImageCaption = getStringOrNull(formData, "coverImageCaption")
  const youtubeUrl = getString(formData, "youtubeUrl")
  const thumbnailUrl = getStringOrNull(formData, "thumbnailUrl")
  const articleType = getString(formData, "articleType") || "article"
  const isPublished = formData.get("isPublished") === "on"
  const publishedAtRaw = getString(formData, "publishedAt")
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : (isPublished && !vlog.publishedAt ? new Date() : vlog.publishedAt)
  const lastModifiedAtRaw = getString(formData, "lastModifiedAt")
  const lastModifiedAt = lastModifiedAtRaw ? new Date(lastModifiedAtRaw) : vlog.lastModifiedAt
  const fieldNotes = getStringOrNull(formData, "fieldNotes")
  const canonicalSlug = getStringOrNull(formData, "canonicalSlug")
  const blogCategoryId = getStringOrNull(formData, "blogCategoryId")
  const lastVerifiedAtRaw2 = getString(formData, "lastVerifiedAt")
  const lastVerifiedAt = lastVerifiedAtRaw2 ? new Date(lastVerifiedAtRaw2) : vlog.lastVerifiedAt
  const terrainProof = parseJson<Array<{ type: string; url: string; caption: string; date: string; location: string }>>(formData, "terrainProof")
  const translationsRaw = getString(formData, "translations")
  const translations = translationsRaw ? (() => { try { return JSON.parse(translationsRaw) as object } catch { return null } })() : null

  const faqs = parseJson<Array<{ question: string; answer: string }>>(formData, "faqs")
  const sources = parseJson<Array<{ title: string; url?: string; date?: string }>>(formData, "sources")
  const tagsRaw = getString(formData, "tags")

  const readingTime = calcReadingTime(content)
  const readabilityScore = calculateReadabilityScore(content)
  const keywordDensityData = focusKeyword ? calculateKeywordDensity(content, focusKeyword) : null

  let slug = vlog.slug
  if (title !== vlog.title) {
    const baseSlug = makeSlug(title)
    slug = baseSlug
    let counter = 1
    while (await prisma.vlog.findFirst({ where: { slug, NOT: { id } } })) slug = `${baseSlug}-${counter++}`

    // Create 301 redirect from old slug to new slug
    if (slug !== vlog.slug) {
      try {
        // Update any existing redirects that point to the old slug to point to the new one
        await prisma.slugRedirect.updateMany({
          where: { newSlug: vlog.slug },
          data: { newSlug: slug },
        })
        // Create redirect for the old slug
        await prisma.slugRedirect.upsert({
          where: { oldSlug: vlog.slug },
          create: { oldSlug: vlog.slug, newSlug: slug },
          update: { newSlug: slug },
        })
      } catch {
        // SlugRedirect table may not exist yet during migration - non-critical
      }
    }
  }

  // Upsert tags
  const tagNames = tagsRaw.split(",").map(t => t.trim()).filter(Boolean)
  const tagConnects = []
  for (const name of tagNames) {
    const tagSlug = makeSlug(name)
    if (!tagSlug) continue
    const tag = await prisma.blogTag.upsert({
      where: { slug: tagSlug },
      create: { name, slug: tagSlug },
      update: {},
    })
    tagConnects.push({ id: tag.id })
  }

  try {
    const updated = await prisma.vlog.update({
      where: { id },
      data: {
        title, slug, excerpt, content, description,
        metaTitle: metaTitle || autoMetaTitle(title),
        metaDescription: metaDescription || autoMetaDescription(excerpt, content),
        focusKeyword, coverImageUrl, coverImageAlt, coverImageCaption,
        youtubeUrl, thumbnailUrl, articleType,
        isPublished, publishedAt, lastModifiedAt,
        readingTime, readabilityScore,
        keywordDensity: keywordDensityData ?? undefined,
        faqs: faqs ?? undefined, sources: sources ?? undefined,
        fieldNotes, canonicalSlug,
        lastVerifiedAt,
        terrainProof: terrainProof ?? undefined,
        translations: translations ?? undefined,
        blogCategoryId,
        tags: { set: [], connect: tagConnects },
      },
    })
    revalidatePath("/vlogs", "page")
    revalidatePath("/vlogs", "layout")
    revalidatePath(`/vlogs/${updated.slug}`)
    if (slug !== vlog.slug) revalidatePath(`/vlogs/${vlog.slug}`)
    revalidatePath("/admin/vlogs")
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: safeError("Failed to update article", error) }
  }
}

export async function deleteVlog(id: string): Promise<ActionResult> {
  const userId = await requireAdmin()
  if (!userId) return { success: false, error: "Not authorized" }

  try {
    await prisma.vlog.delete({ where: { id } })
    revalidatePath("/vlogs", "page")
    revalidatePath("/vlogs", "layout")
    revalidatePath("/admin/vlogs")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete article", error) }
  }
}

export async function addBlogMedia(vlogId: string, data: { url: string; alt?: string; caption?: string }): Promise<ActionResult<BlogMedia>> {
  const userId = await requireAdmin()
  if (!userId) return { success: false, error: "Not authorized" }

  const count = await prisma.blogMedia.count({ where: { vlogId } })

  try {
    const media = await prisma.blogMedia.create({
      data: { url: data.url, alt: data.alt || "", caption: data.caption || "", order: count, vlogId },
    })
    revalidatePath("/admin/vlogs")
    return { success: true, data: media }
  } catch (error) {
    return { success: false, error: safeError("Failed to add image", error) }
  }
}

export async function deleteBlogMedia(id: string): Promise<ActionResult> {
  const userId = await requireAdmin()
  if (!userId) return { success: false, error: "Not authorized" }

  try {
    await prisma.blogMedia.delete({ where: { id } })
    revalidatePath("/admin/vlogs")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: safeError("Failed to delete image", error) }
  }
}

export async function incrementVlogViews(slug: string): Promise<void> {
  try {
    await prisma.vlog.update({ where: { slug }, data: { viewCount: { increment: 1 } } })
  } catch {
    // Silently fail - non-critical
  }
}

export async function searchVlogs(query: string): Promise<Array<{ title: string; slug: string }>> {
  if (!query || query.length < 2) return []
  return prisma.vlog.findMany({
    where: { isPublished: true, title: { contains: query, mode: "insensitive" } },
    select: { title: true, slug: true },
    take: 10,
  })
}

export async function searchVenues(query: string): Promise<Array<{ name: string; slug: string; category: string }>> {
  if (!query || query.length < 2) return []
  const venues = await prisma.venue.findMany({
    where: { isActive: true, name: { contains: query, mode: "insensitive" } },
    select: { name: true, slug: true, category: { select: { name: true } } },
    take: 10,
  })
  return venues.map(v => ({ name: v.name, slug: v.slug, category: v.category.name }))
}
