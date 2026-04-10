"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react"
import { ZoomableImage } from "@/components/ui/zoomable-image"
import type { VenueMenuMedia } from "@prisma/client"

interface VenueMenuGalleryProps {
  menuMedia: VenueMenuMedia[]
}

export function VenueMenuGallery({ menuMedia }: VenueMenuGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (lightboxIndex !== null && thumbStripRef.current) {
      const thumb = thumbStripRef.current.children[lightboxIndex] as HTMLElement
      if (thumb) {
        thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [lightboxIndex])

  const prev = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex((lightboxIndex - 1 + menuMedia.length) % menuMedia.length)
  }, [lightboxIndex, menuMedia.length])

  const next = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex((lightboxIndex + 1) % menuMedia.length)
  }, [lightboxIndex, menuMedia.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "Escape") setLightboxIndex(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxIndex, prev, next])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }, [next, prev])

  if (!menuMedia.length) return null

  const gridImages = menuMedia.slice(0, 4)
  const totalExtra = menuMedia.length - gridImages.length

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-orange-400" />
          <h3 className="font-semibold text-sm">
            Menu - {menuMedia.length} photo{menuMedia.length !== 1 ? "s" : ""}
          </h3>
        </div>

        <div className={`grid gap-2 ${gridImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {gridImages.map((img, i) => {
            const isLast = i === gridImages.length - 1 && totalExtra > 0
            return (
              <div
                key={img.id}
                className="relative rounded-lg overflow-hidden border border-border bg-muted cursor-pointer group aspect-video"
                onClick={() => setLightboxIndex(i)}
              >
                <Image src={img.url} alt="menu" fill className="object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  {isLast ? (
                    <span className="text-white font-semibold text-lg bg-black/60 rounded-full px-4 py-1">+{totalExtra}</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-20" onClick={() => setLightboxIndex(null)}>
            <X className="h-8 w-8" />
          </button>

          <div className="absolute top-4 left-4 text-white/60 text-sm z-20 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-orange-400" />
            Menu - {lightboxIndex + 1} / {menuMedia.length}
          </div>

          <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {menuMedia.length > 1 && (
              <button
                className="absolute left-2 sm:left-4 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); prev() }}
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}

            <div className="relative w-full h-full max-w-5xl mx-12 sm:mx-20" onClick={(e) => e.stopPropagation()}>
              <ZoomableImage
                src={menuMedia[lightboxIndex].url}
                alt="menu"
              />
            </div>

            {menuMedia.length > 1 && (
              <button
                className="absolute right-2 sm:right-4 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); next() }}
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}
          </div>

          {menuMedia.length > 1 && (
            <div className="shrink-0 py-3 px-4" onClick={(e) => e.stopPropagation()}>
              <div
                ref={thumbStripRef}
                className="flex gap-2 overflow-x-auto justify-center scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {menuMedia.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setLightboxIndex(i)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === lightboxIndex
                        ? "border-orange-400 ring-1 ring-orange-400 opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <Image src={item.url} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
