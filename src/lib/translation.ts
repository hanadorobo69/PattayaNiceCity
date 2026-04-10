import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type EntityType = "post" | "comment" | "venue_comment" | "girl_comment" | "event" | "venue" | "girl";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
};

export function contentHash(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Translate text using Google Cloud Translation API v2 (free tier compatible).
 * Falls back to returning null if translation fails.
 */
async function callTranslationAPI(
  text: string,
  from: string,
  to: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    // Fallback: use free Google Translate endpoint (limited, no API key needed)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const data = await res.json();
      // Response format: [[["translated text","original text",...],...],...]
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((segment: any[]) => segment[0]).join("");
      }
      return null;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: from === "zh" ? "zh-CN" : from,
          target: to === "zh" ? "zh-CN" : to,
          format: "text",
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.translations?.[0]?.translatedText ?? null;
  } catch {
    return null;
  }
}

/**
 * Get or create a translation for a piece of content.
 * Returns the translated text, or the original if translation fails or source === target.
 */
export async function getOrCreateTranslation({
  entityType,
  entityId,
  field,
  sourceText,
  sourceLanguage,
  targetLanguage,
}: {
  entityType: EntityType;
  entityId: string;
  field: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<{
  text: string;
  isTranslated: boolean;
  sourceLanguage: string;
}> {
  // Same language → return original
  if (sourceLanguage === targetLanguage) {
    return { text: sourceText, isTranslated: false, sourceLanguage };
  }

  const hash = contentHash(sourceText);

  // Check cache
  const cached = await prisma.translation.findUnique({
    where: {
      entityType_entityId_field_targetLanguage: {
        entityType,
        entityId,
        field,
        targetLanguage,
      },
    },
  });

  // Cache hit with matching hash → return cached
  if (cached && cached.contentHash === hash) {
    return { text: cached.translatedText, isTranslated: true, sourceLanguage };
  }

  // Need fresh translation
  const translated = await callTranslationAPI(sourceText, sourceLanguage, targetLanguage);

  if (!translated) {
    return { text: sourceText, isTranslated: false, sourceLanguage };
  }

  // Upsert translation cache
  await prisma.translation.upsert({
    where: {
      entityType_entityId_field_targetLanguage: {
        entityType,
        entityId,
        field,
        targetLanguage,
      },
    },
    create: {
      entityType,
      entityId,
      field,
      sourceLanguage,
      contentHash: hash,
      targetLanguage,
      translatedText: translated,
      provider: process.env.GOOGLE_TRANSLATE_API_KEY ? "google" : "google-free",
    },
    update: {
      contentHash: hash,
      translatedText: translated,
      sourceLanguage,
      provider: process.env.GOOGLE_TRANSLATE_API_KEY ? "google" : "google-free",
    },
  });

  return { text: translated, isTranslated: true, sourceLanguage };
}
