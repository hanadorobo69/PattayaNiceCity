import { prisma } from "@/lib/prisma"

export const revalidate = 1800 // 30 min

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  // Google News requires articles published within the last 2 days
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const articles = await prisma.vlog.findMany({
    where: {
      isPublished: true,
      publishedAt: { gte: twoDaysAgo },
    },
    select: {
      slug: true,
      title: true,
      publishedAt: true,
      focusKeyword: true,
      tags: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 1000,
  })

  const entries = articles.map((a) => {
    const pubDate = a.publishedAt ? a.publishedAt.toISOString() : new Date().toISOString()
    const keywords = [a.focusKeyword, ...a.tags.map(t => t.name)].filter(Boolean).join(", ")

    return `  <url>
    <loc>${siteUrl}/vlogs/${escapeXml(a.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Pattaya Nice City</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>${keywords ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join("\n")}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  })
}
