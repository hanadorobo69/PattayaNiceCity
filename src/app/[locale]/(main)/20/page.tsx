"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"

const STORAGE_KEY = "pvc_age_verified"

export default function AgePage() {
  const t = useTranslations("ageGate")
  const router = useRouter()

  useEffect(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  function handleEnter() {
    try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
    router.push("/")
  }

  function handleLeave() {
    window.location.href = "https://www.google.com"
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col">
      {/* Background - calé à droite */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/assets/about/background+logo.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "50% center",
          }}
        />
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(to bottom, rgba(26,21,16,0.20) 0%, rgba(26,21,16,0.50) 40%, rgba(26,21,16,0.88) 70%, #1a1510 100%)",
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center gap-6">
        <img
          src="/assets/about/logo_reflect.png"
          alt="Pattaya Nice City"
          style={{
            width: "clamp(180px, 42vw, 480px)",
            height: "auto",
            filter: "drop-shadow(0 0 18px rgba(232,168,64,0.9)) drop-shadow(0 0 55px rgba(232,168,64,0.45))",
          }}
        />

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleEnter}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white font-bold text-sm hover:shadow-[0_0_24px_rgba(232,168,64,0.5)] transition-all cursor-pointer"
          >
            {t("enter")}
          </button>
          <button
            onClick={handleLeave}
            className="w-full py-2.5 rounded-xl border border-[rgba(232,168,64,0.20)] text-white/50 text-sm hover:text-white hover:border-[rgba(232,168,64,0.40)] transition-all cursor-pointer"
          >
            {t("leave")}
          </button>
          <p className="text-xs text-white/40 leading-relaxed" style={{ textShadow: "0 0 12px rgba(0,0,0,0.95)" }}>
            {t("description")}
          </p>
        </div>
      </div>
    </div>
  )
}
