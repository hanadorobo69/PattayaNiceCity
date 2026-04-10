"use client"

import { useState, useEffect, useRef } from "react"
import { List, ChevronDown } from "lucide-react"

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  headings: Heading[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    )

    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [headings])

  if (headings.length < 3) return null

  const minLevel = Math.min(...headings.map(h => h.level))

  return (
    <nav className="rounded-2xl border satine-border bg-card overflow-hidden">
      {/* Header - always visible, clickable on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 md:cursor-default"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <List className="h-4 w-4 text-[#3db8a0]" />
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
            Table of Contents
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground md:hidden transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Links - collapsible on mobile, always visible on desktop */}
      <div className={`px-4 pb-4 space-y-1 ${isOpen ? "block" : "hidden md:block"}`}>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            onClick={() => setIsOpen(false)}
            className={`block text-xs leading-relaxed py-1 transition-colors hover:text-[#e8a840] ${
              activeId === h.id
                ? "text-[#e8a840] font-medium"
                : "text-muted-foreground"
            }`}
            style={{ paddingLeft: `${(h.level - minLevel) * 12 + 4}px` }}
          >
            {h.text}
          </a>
        ))}
      </div>
    </nav>
  )
}
