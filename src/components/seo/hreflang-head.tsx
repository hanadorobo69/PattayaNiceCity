"use client"

import { usePathname } from "next/navigation"
import { locales, defaultLocale, type Locale } from "@/i18n/config"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

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
 * Client component that injects hreflang <link> tags into <head>
 * for every page, based on the current pathname.
 *
 * Uses next/navigation's usePathname (which includes the locale prefix)
 * and strips the locale prefix to build correct hreflang URLs.
 */
export function HreflangHead() {
  const rawPathname = usePathname()

  // Strip locale prefix from pathname to get the base path
  let basePath = rawPathname
  for (const locale of locales) {
    if (rawPathname === `/${locale}`) {
      basePath = "/"
      break
    }
    if (rawPathname.startsWith(`/${locale}/`)) {
      basePath = rawPathname.slice(`/${locale}`.length)
      break
    }
  }

  return (
    <>
      {locales.map((locale) => {
        const href =
          locale === defaultLocale
            ? `${baseUrl}${basePath}`
            : `${baseUrl}/${locale}${basePath}`
        return (
          <link
            key={locale}
            rel="alternate"
            hrefLang={hreflangMap[locale]}
            href={href}
          />
        )
      })}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}${basePath}`}
      />
    </>
  )
}
