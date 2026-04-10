import { locales, defaultLocale, type Locale } from "@/i18n/config"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

// Map locale codes to BCP-47 hreflang codes
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

/**
 * Generates hreflang <link> tags for all supported locales.
 * Must be rendered inside <head> (via Next.js metadata or layout).
 */
export function HreflangTags({ path }: { path: string }) {
  // Ensure path starts with /
  const cleanPath = path.startsWith("/") ? path : `/${path}`

  return (
    <>
      {locales.map((locale) => {
        const href =
          locale === defaultLocale
            ? `${baseUrl}${cleanPath}`
            : `${baseUrl}/${locale}${cleanPath}`
        return (
          <link
            key={locale}
            rel="alternate"
            hrefLang={hreflangMap[locale]}
            href={href}
          />
        )
      })}
      {/* x-default points to the default locale (English) */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}${cleanPath}`}
      />
    </>
  )
}
