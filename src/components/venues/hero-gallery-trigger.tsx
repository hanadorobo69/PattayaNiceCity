"use client"

import { useCallback } from "react"

interface HeroGalleryTriggerProps {
  children: React.ReactNode
  className?: string
  href: string
}

export function HeroGalleryTrigger({ children, className, href }: HeroGalleryTriggerProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only intercept left-click; let middle-click / ctrl+click open new tab naturally
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
    e.preventDefault()
    window.location.hash = "gallery"
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-gallery-lightbox"))
    }, 150)
  }, [])

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
