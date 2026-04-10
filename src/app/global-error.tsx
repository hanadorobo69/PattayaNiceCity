"use client"

import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Auto-reload once on stale cache errors (after deploy)
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
    <html>
      <body style={{ background: "#0c0a1a", color: "#ededed", fontFamily: "sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", textAlign: "center", padding: "1.5rem" }}>
          <p style={{ fontSize: "3.5rem", fontWeight: 800, background: "linear-gradient(to right, #e8a840, #e07850, #3db8a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            OOPS!?
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", maxWidth: "20rem" }}>
            Something went wrong. Please try again.
          </p>
          <div style={{ height: 3, width: 120, borderRadius: 999, background: "linear-gradient(to right, #e8a840, #e07850, #3db8a0)" }} />
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "0.75rem 1.5rem", borderRadius: "0.75rem", background: "linear-gradient(to right, #e8a840, #e07850)", color: "white", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  )
}
