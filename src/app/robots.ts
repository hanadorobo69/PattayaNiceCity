import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pattayanicecity.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og'],
        disallow: [
          '/api/',
          '/admin/',
          '/*/admin/',
          '/create',
          '/*/create',
          '/verify',
          '/*/verify',
          '/profile/*/edit',
          '/*/profile/*/edit',
          '/login',
          '/*/login',
          '/register',
          '/*/register',
        ],
      },
      // Block AI scrapers from scraping user content
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        disallow: ['/community/', '/*/community/'],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/image-sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
  }
}
