"use client"

import { useState, useRef, useEffect, useMemo, useTransition } from "react"
import Image from "next/image"
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config"
import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"

function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  const cc = localeFlags[code as Locale] ?? code
  return (
    <Image
      src={`/flags/${cc}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={localeNames[code as Locale] ?? code}
      className="rounded-sm object-cover"
    />
  )
}

export function AuthLanguageSelector() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const sortedLocales = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([current], { type: "language" })
      return [...locales].sort((a, b) => {
        const nameA = dn.of(a === "yue" ? "zh-Hant-HK" : a) ?? localeNames[a]
        const nameB = dn.of(b === "yue" ? "zh-Hant-HK" : b) ?? localeNames[b]
        return nameA.localeCompare(nameB, current)
      })
    } catch {
      return [...locales].sort((a, b) => localeNames[a].localeCompare(localeNames[b]))
    }
  }, [current])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function selectLang(code: string) {
    if (code === current) { setOpen(false); return }
    setOpen(false)
    startTransition(() => {
      router.replace(pathname, { locale: code as Locale })
    })
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(232,168,64,0.2)] bg-[rgba(26,21,16,0.6)] hover:bg-[rgba(232,168,64,0.12)] transition-colors cursor-pointer"
        aria-label="Language"
        type="button"
      >
        <FlagImg code={current} size={18} />
        <span className="text-xs text-muted-foreground">{localeNames[current as Locale]}</span>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[200] bg-[rgba(36,28,20,0.98)] border border-[rgba(232,168,64,0.25)] rounded-xl shadow-2xl p-1.5 min-w-[200px] backdrop-blur-xl max-h-[300px] overflow-y-auto">
          {sortedLocales.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => selectLang(code)}
              disabled={isPending}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                current === code
                  ? "bg-[rgba(232,168,64,0.12)] text-[#e8a840] font-medium"
                  : "text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)]"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <FlagImg code={code} size={18} />
              <span>{localeNames[code]}</span>
              {current === code && (
                <span className="ml-auto text-[10px] text-[#3db8a0]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
