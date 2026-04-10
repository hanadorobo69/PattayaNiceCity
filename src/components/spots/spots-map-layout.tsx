"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import type { MapVenue } from "./spots-map"

const SpotsMap = dynamic(() => import("./spots-map").then((m) => ({ default: m.SpotsMap })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl bg-[rgba(36,28,20,0.6)] border border-[rgba(232,168,64,0.15)] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground text-sm">Loading map...</div>
    </div>
  ),
})

interface SpotsMapLayoutProps {
  venues: MapVenue[]
  locale?: string
  children: React.ReactNode
}

export function SpotsMapLayout({ venues, locale, children }: SpotsMapLayoutProps) {
  // Default to map, restore from localStorage after mount
  const [view, setView] = useState<"list" | "map">("map")
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Restore saved view preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("pvc-spots-view") as "list" | "map" | null
    if (saved && saved !== view) setView(saved)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist view changes
  useEffect(() => {
    localStorage.setItem("pvc-spots-view", view)
  }, [view])

  // No auto-scroll: keep title + search + filters + map all visible on one screen

  useEffect(() => {
    function onHighlight(e: Event) {
      setHighlightedId((e as CustomEvent).detail?.venueId ?? null)
    }
    window.addEventListener("highlight-venue", onHighlight)
    return () => window.removeEventListener("highlight-venue", onHighlight)
  }, [])

  const mapRef = useRef<HTMLDivElement>(null)
  const [btnTop, setBtnTop] = useState<number | null>(null)

  useEffect(() => {
    if (view !== "map") {
      setBtnTop(null)
      return
    }
    if (!mapRef.current) return
    function update() {
      const rect = mapRef.current?.getBoundingClientRect()
      if (rect) setBtnTop(rect.top + rect.height / 2)
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
    }
  }, [view])

  function toggle() {
    setView(view === "list" ? "map" : "list")
  }

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {view === "list" && <div>{children}</div>}

        {view === "map" && (
          <div
            ref={mapRef}
            className="relative z-0 overflow-hidden rounded-xl border border-[rgba(232,168,64,0.15)]"
            style={{ height: "calc(100dvh - 24.5rem)", minHeight: 160 }}
          >
            <SpotsMap venues={venues} locale={locale} highlightedId={highlightedId} mobile />
          </div>
        )}
      </div>

      {/* FAB map/list toggle */}
      <div className="lg:hidden">
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-full font-bold active:scale-95 transition-transform"
          style={{
            position: "fixed",
            zIndex: 10000,
            right: 12,
            top: btnTop ?? "50%",
            transform: "translateY(-50%)",
            width: 48,
            height: 48,
            background: "rgba(26,21,16,0.92)",
            border: "1.5px solid rgba(232,168,64,0.55)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 18px rgba(232,168,64,0.30)",
            fontSize: 20,
          }}
        >
          {view === "list" ? "🗺️" : "📝"}
        </button>
      </div>

      {/* ── Desktop: side-by-side grid ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="lg:overflow-y-auto lg:max-h-[calc(100vh-7.75rem)] scrollbar-hide pt-2 px-4">
          {children}
        </div>
        <div className="sticky top-[calc(4.25rem+1rem)]" style={{ height: "calc(100vh - 9rem)" }}>
          <div className="h-full rounded-xl overflow-hidden glass-card border border-[rgba(232,168,64,0.15)]">
            <SpotsMap venues={venues} locale={locale} highlightedId={highlightedId} />
          </div>
        </div>
      </div>
    </>
  )
}
