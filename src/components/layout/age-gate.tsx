"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

const STORAGE_KEY = "pvc_age_verified"

export function AgeGate() {
  const [show, setShow] = useState(true)
  const t = useTranslations("ageGate")

  useEffect(() => {
    // The blocking script in <head> already handles visibility via CSS classes.
    // Here we just sync React state.
    const html = document.documentElement
    if (html.classList.contains("age-ok")) {
      setShow(false)
    } else {
      document.body.style.overflow = "hidden"
    }
  }, [])

  // Block Escape key and any keyboard shortcut while age gate is shown
  useEffect(() => {
    if (!show) return
    function blockKeys(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener("keydown", blockKeys, true)
    return () => window.removeEventListener("keydown", blockKeys, true)
  }, [show])

  function handleEnter() {
    try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
    // Also set cookie so server/blocking script can detect it
    try { document.cookie = "pvc_age_verified=1;path=/;max-age=31536000;SameSite=Lax" } catch {}
    document.body.style.overflow = ""
    document.documentElement.classList.remove("age-pending")
    document.documentElement.classList.add("age-ok")
    setShow(false)
  }

  function handleLeave() {
    window.location.href = "https://www.google.com"
  }

  if (!show) return null

  return (
    <div className="age-gate fixed inset-0 z-[9999] flex flex-col bg-[#1a1510]">
      {/* Background - calé à droite */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/assets/about/background+logo.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "38% center",
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

      {/* Contenu : logo_reflect centré, bouton Enter au milieu, reste en dessous */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center gap-6">
        <img
          src="/assets/about/logo_reflect.png"
          alt="Pattaya Vice City"
          style={{
            width: "clamp(180px, 42vw, 480px)",
            height: "auto",
            filter: "drop-shadow(0 0 18px rgba(232,168,64,0.9)) drop-shadow(0 0 55px rgba(232,168,64,0.45))",
          }}
        />

        {/* Boutons groupés - ONLY YES or NO */}
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
