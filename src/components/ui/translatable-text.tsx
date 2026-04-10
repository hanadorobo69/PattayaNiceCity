"use client"

import { useState, useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Languages } from "lucide-react"

export type EntityType = "post" | "comment" | "venue_comment" | "girl_comment" | "event" | "venue" | "girl"

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
}

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code
}

interface TranslatableTextProps {
  entityType: EntityType
  entityId: string
  field: string
  originalText: string
  sourceLanguage: string
  className?: string
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3"
  children?: React.ReactNode
}

export function TranslatableText({
  entityType,
  entityId,
  field,
  originalText,
  sourceLanguage,
  className = "",
  as: Tag = "span",
  children,
}: TranslatableTextProps) {
  const locale = useLocale()
  const t = useTranslations("common")
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [failed, setFailed] = useState(false)

  const needsTranslation = sourceLanguage !== locale

  const handleTranslate = useCallback(async () => {
    if (translatedText) {
      setShowOriginal(prev => !prev)
      return
    }

    setIsTranslating(true)
    setFailed(false)

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          field,
          sourceText: originalText,
          sourceLanguage,
          targetLanguage: locale,
        }),
      })

      if (!res.ok) throw new Error("Translation failed")

      const data = await res.json()
      if (data.isTranslated) {
        setTranslatedText(data.text)
        setShowOriginal(false)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setIsTranslating(false)
    }
  }, [entityType, entityId, field, originalText, sourceLanguage, locale, translatedText])

  // Same language - just render as-is
  if (!needsTranslation) {
    return children ? <>{children}</> : <Tag className={className}>{originalText}</Tag>
  }

  const displayText = translatedText && !showOriginal ? translatedText : originalText

  return (
    <span className="inline">
      {children ? (
        // When children are provided (e.g. MentionText), we show the button below
        <>{showOriginal || !translatedText ? children : <Tag className={className}>{translatedText}</Tag>}</>
      ) : (
        <Tag className={className}>{displayText}</Tag>
      )}
      <span className="block mt-1">
        {isTranslating ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-[rgba(183,148,212,0.60)]">
            <Languages className="h-3 w-3 animate-pulse" />
            {t("translating")}
          </span>
        ) : failed ? (
          <span className="text-[10px] text-[rgba(183,148,212,0.40)]">{t("translationFailed")}</span>
        ) : (
          <button
            onClick={handleTranslate}
            className="inline-flex items-center gap-1 text-[10px] text-[rgba(61,184,160,0.60)] hover:text-[#3db8a0] transition-colors cursor-pointer"
          >
            <Languages className="h-3 w-3" />
            {translatedText
              ? (showOriginal ? t("showTranslation") : t("showOriginal"))
              : t("translatedFrom", { language: getLanguageName(sourceLanguage) })
            }
          </button>
        )}
      </span>
    </span>
  )
}
