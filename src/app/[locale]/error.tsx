"use client"

import { useEffect } from "react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)

    // Auto-reload once on stale cache errors (server action mismatch after deploy).
    // Guard with sessionStorage to prevent infinite reload loops.
    try {
      const key = "pvc_error_reload"
      const last = sessionStorage.getItem(key)
      const now = Date.now()
      if (!last || now - parseInt(last) > 30000) {
        sessionStorage.setItem(key, String(now))
        window.location.reload()
        return
      }
    } catch {}
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center gap-6">
      <p className="text-6xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
        OOPS!?
      </p>
      <p className="text-muted-foreground text-sm max-w-xs">
        Something went wrong loading this page. Please try again.
      </p>
      <div className="h-[3px] w-[120px] rounded-full bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] animate-pulse" />
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white font-semibold text-sm hover:shadow-[0_0_24px_rgba(232,168,64,0.5)] transition-all cursor-pointer"
      >
        Retry
      </button>
    </div>
  )
}
