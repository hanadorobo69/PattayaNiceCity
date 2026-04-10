"use client"

import { useState, useRef, useEffect, useCallback } from "react"

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "gallery", label: "Gallery", icon: "📸" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
] as const

export type TabId = (typeof TABS)[number]["id"]

const VALID_TABS = new Set<string>(TABS.map(t => t.id))

function getTabFromHash(): TabId {
  if (typeof window === "undefined") return "overview"
  const hash = window.location.hash.replace("#", "")
  return VALID_TABS.has(hash) ? (hash as TabId) : "overview"
}

interface VenueDetailTabsProps {
  children: Record<TabId, React.ReactNode>
  header?: React.ReactNode
}

export function VenueDetailTabs({ children, header }: VenueDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const tabBarRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)
  const activeTabRef = useRef<TabId>(activeTab)

  // Keep ref in sync so native event handlers always see latest value
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])

  // Scroll so the tab bar sits right below the navbar (3.5rem = 56px)
  const scrollToTabs = useCallback(() => {
    if (!tabBarRef.current) return
    const y = tabBarRef.current.getBoundingClientRect().top + window.scrollY - 56
    window.scrollTo({ top: y, behavior: "smooth" })
  }, [])

  // Sync tab from hash on mount (after hydration to avoid SSR mismatch)
  useEffect(() => {
    setActiveTab(getTabFromHash())
  }, [])

  // Listen to popstate (browser back/forward) and hashchange to restore tab
  useEffect(() => {
    function syncTab() {
      const tab = getTabFromHash()
      setActiveTab(tab)
      // Scroll tab bar below navbar when navigating via hash
      if (tab !== "overview") {
        setTimeout(scrollToTabs, 50)
      }
    }
    window.addEventListener("popstate", syncTab)
    window.addEventListener("hashchange", syncTab)
    return () => {
      window.removeEventListener("popstate", syncTab)
      window.removeEventListener("hashchange", syncTab)
    }
  }, [scrollToTabs])

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab)
    // Push hash to history so back button works
    const url = new URL(window.location.href)
    url.hash = tab === "overview" ? "" : tab
    window.history.pushState(null, "", url.toString())
    // Only scroll back up to tabs if we've scrolled past them (sentinel above navbar)
    if (tabBarRef.current) {
      const sentinelTop = tabBarRef.current.getBoundingClientRect().top
      if (sentinelTop < 56) {
        setTimeout(scrollToTabs, 50)
      }
    }
  }, [scrollToTabs])

  // Sticky detection
  useEffect(() => {
    const el = tabBarRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 1, rootMargin: "-57px 0px 0px 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Native touch swipe on entire document - works from anywhere on the page
  useEffect(() => {
    let startX = 0
    let startY = 0

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      // Only trigger if horizontal swipe is dominant and long enough
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.7) return
      const currentIndex = TABS.findIndex(t => t.id === activeTabRef.current)
      if (dx < 0 && currentIndex < TABS.length - 1) {
        switchTab(TABS[currentIndex + 1].id)
      } else if (dx > 0 && currentIndex > 0) {
        switchTab(TABS[currentIndex - 1].id)
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [switchTab])

  const activeIndex = TABS.findIndex(t => t.id === activeTab)

  return (
    <div ref={wrapperRef}>
      {/* Sentinel for sticky detection */}
      <div ref={tabBarRef} />

      {/* Sticky tab bar */}
      <div
        className={`sticky top-[3.5rem] z-20 -mx-1 px-1 transition-all ${
          isSticky ? "py-2 border-b border-[rgba(232,168,64,0.15)]" : "py-2"
        }`}
        style={{ background: isSticky ? "rgba(26,21,16,0.95)" : "transparent", backdropFilter: isSticky ? "blur(12px)" : "none" }}
      >
        <div className="grid grid-cols-4 gap-2 p-1.5 rounded-xl bg-[rgba(36,28,20,0.60)] border border-[rgba(232,168,64,0.15)]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-semibold transition-colors duration-200 cursor-pointer outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#3db8a0] to-[#e07850] text-white shadow-[0_0_12px_rgba(61,184,160,0.3)]"
                  : "text-muted-foreground hover:text-[#3db8a0] hover:bg-[rgba(61,184,160,0.08)] border border-transparent hover:border-[rgba(61,184,160,0.20)]"
              }`}
              style={{ WebkitTapHighlightColor: "transparent", boxShadow: activeTab === tab.id ? undefined : "none" }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dot indicators - mobile only */}
        <div className="flex sm:hidden justify-center gap-2 mt-2">
          {TABS.map((tab, i) => (
            <div
              key={tab.id}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 h-2 bg-gradient-to-r from-[#3db8a0] to-[#e07850]"
                  : "w-2 h-2 bg-[rgba(255,255,255,0.2)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Header (hero) between tabs and content */}
      {header && <div className="mt-3">{header}</div>}

      {/* Tab content - swipeable on mobile */}
      <div className="mt-4">
        {TABS.map(tab => (
          <div key={tab.id} style={{ display: activeTab === tab.id ? undefined : "none" }}>
            {children[tab.id]}
          </div>
        ))}
      </div>
    </div>
  )
}
