export const defaultLocale = "en" as const;

export const locales = ["en", "fr", "es", "zh", "ko", "ja", "de", "yue", "th", "ru", "ar", "hi", "da", "no", "sv", "tr", "nl", "it", "pl"] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  de: "Deutsch",
  yue: "廣東話",
  th: "ภาษาไทย",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  da: "Dansk",
  no: "Norsk",
  sv: "Svenska",
  tr: "Turkce",
  nl: "Nederlands",
  it: "Italiano",
  pl: "Polski",
};

export const localeFlags: Record<Locale, string> = {
  en: "gb",
  fr: "fr",
  es: "es",
  zh: "cn",
  ko: "kr",
  ja: "jp",
  de: "de",
  yue: "hk",
  th: "th",
  ru: "ru",
  ar: "sa",
  hi: "in",
  da: "dk",
  no: "no",
  sv: "se",
  tr: "tr",
  nl: "nl",
  it: "it",
  pl: "pl",
};

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
