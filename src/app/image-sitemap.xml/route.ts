import { prisma } from "@/lib/prisma"

export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  let vlogs: any[] = []
  try {
    vlogs = await prisma.vlog.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        title: true,
        coverImageUrl: true,
        coverImageAlt: true,
        coverImageCaption: true,
        media: { select: { url: true, alt: true, caption: true } },
      },
    })
  } catch {}

  const [venues] = await Promise.all([
    prisma.venue.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        imageUrl: true,
        media: { select: { url: true, caption: true } },
        menuMedia: { select: { url: true } },
      },
    }),
  ])

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`

  const GEO = "Pattaya, Thailand"

  // Blog article images
  for (const vlog of vlogs) {
    const images: Array<{ url: string; title?: string; caption?: string }> = []

    if (vlog.coverImageUrl) {
      images.push({
        url: vlog.coverImageUrl,
        title: vlog.coverImageAlt || vlog.title,
        caption: vlog.coverImageCaption || undefined,
      })
    }

    for (const m of vlog.media) {
      images.push({
        url: m.url,
        title: m.alt || vlog.title,
        caption: m.caption || undefined,
      })
    }

    if (images.length > 0) {
      xml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/vlogs/${vlog.slug}`)}</loc>`
      for (const img of images) {
        xml += `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>`
        if (img.title) xml += `
      <image:title>${escapeXml(img.title)}</image:title>`
        if (img.caption) xml += `
      <image:caption>${escapeXml(img.caption)}</image:caption>`
        xml += `
      <image:geo_location>${GEO}</image:geo_location>
    </image:image>`
      }
      xml += `
  </url>`
    }
  }

  // Venue images
  for (const venue of venues) {
    const images: Array<{ url: string; title?: string; caption?: string }> = []

    if (venue.imageUrl) {
      images.push({ url: venue.imageUrl, title: venue.name })
    }

    for (const m of venue.media) {
      images.push({ url: m.url, title: venue.name, caption: m.caption || undefined })
    }

    for (const m of venue.menuMedia) {
      images.push({ url: m.url, title: `${venue.name} menu` })
    }

    if (images.length > 0) {
      xml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/places/${venue.slug}`)}</loc>`
      for (const img of images) {
        xml += `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>`
        if (img.title) xml += `
      <image:title>${escapeXml(img.title)}</image:title>`
        if (img.caption) xml += `
      <image:caption>${escapeXml(img.caption)}</image:caption>`
        xml += `
      <image:geo_location>${GEO}</image:geo_location>
    </image:image>`
      }
      xml += `
  </url>`
    }
  }

  xml += `
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
