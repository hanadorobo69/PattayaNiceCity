"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { X, Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAPrompt() {
  const t = useTranslations("pwa")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    // Check if already installed as PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true
    if (isStandalone) return

    // Check if user dismissed recently (don't show again for 7 days)
    const dismissed = localStorage.getItem("pwa-dismissed")
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    // iOS detection (no beforeinstallprompt event)
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document)
    if (isIOSDevice) {
      setIsIOS(true)
      setShowBanner(true)
      return
    }

    // Android/Chrome - listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null)
        setShowBanner(false)
      })
    }
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem("pwa-dismissed", String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 safe-area-bottom">
      <div className="max-w-md mx-auto rounded-2xl border border-[rgba(232,168,64,0.3)] bg-[rgba(15,11,21,0.95)] backdrop-blur-xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8a840] to-[#e07850] flex items-center justify-center">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t("installTitle")}</p>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap <span className="inline-block align-middle">
                  <svg className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                </span> then <strong>{`"${t("addToHomeScreen")}"`}</strong>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("addForBestExperience")}
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] hover:opacity-90 transition-opacity"
          >
            {t("installApp")}
          </button>
        )}
      </div>
    </div>
  )
}
