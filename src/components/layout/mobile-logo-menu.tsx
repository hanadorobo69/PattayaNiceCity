"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Heart, FileText, Shield, BookOpen, Mail, MapPin, Users, Video, Crown } from "lucide-react"

export function MobileLogoMenu() {
  const [open, setOpen] = useState(false)
  const t = useTranslations("mobile")

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("[data-logo-menu]")) setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open])

  // Close on route change (Escape key)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  const legalItems = [
    { href: "/legal", label: t("menuTerms"), icon: FileText },
    { href: "/legal#privacy-policy", label: t("menuPrivacy"), icon: Shield },
    { href: "/legal#community-guidelines", label: t("menuGuidelines"), icon: BookOpen },
    { href: "/contact", label: t("menuContact"), icon: Mail },
  ]

  return (
    <div className="relative md:hidden" data-logo-menu>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="rounded-lg overflow-hidden shrink-0 cursor-pointer"
      >
        <Image
          src="/assets/about/logo_noreflect.png"
          alt="Menu"
          width={40}
          height={40}
          className="rounded-lg object-cover"
          priority
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[199] bg-black/40" onClick={() => setOpen(false)} />

          {/* Menu panel */}
          <div className="absolute left-0 top-full mt-2 z-[200] bg-[rgba(36,28,20,0.98)] border border-[rgba(232,168,64,0.25)] rounded-xl shadow-2xl p-1.5 min-w-[220px] backdrop-blur-xl logo-menu-panel">
            <div className="px-3 py-2 border-b border-[rgba(232,168,64,0.15)] mb-1">
              <span className="text-sm font-bold font-[family-name:var(--font-orbitron)]">
                <span className="text-[#e8a840]">Pattaya</span>
                <span className="text-[#3db8a0] ml-1">Nice City</span>
              </span>
            </div>
            {/* Spots */}
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)] transition-colors">
              <MapPin className="h-4 w-4 text-[#e8a840]" />
              {t("spots")}
            </Link>
            <div className="mx-3 my-1 border-t border-[rgba(232,168,64,0.10)]" />
            {/* Community */}
            <Link href="/community" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)] transition-colors">
              <Users className="h-4 w-4 text-[#e8a840]" />
              {t("community")}
            </Link>
            {/* Blog */}
            <Link href="/vlogs" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)] transition-colors">
              <Video className="h-4 w-4 text-[#e8a840]" />
              Blog
            </Link>
            {/* Members */}
            <Link href="/members" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)] transition-colors">
              <Crown className="h-4 w-4 text-[#e8a840]" />
              Squad
            </Link>
            <div className="mx-3 my-1 border-t border-[rgba(232,168,64,0.10)]" />
            {/* About & Legal */}
            {[{ href: "/about", label: t("menuAbout"), icon: Heart }, ...legalItems].map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#ededed] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.08)] transition-colors"
              >
                <item.icon className="h-4 w-4 text-[#e8a840]" />
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
