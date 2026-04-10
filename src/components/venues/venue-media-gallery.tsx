"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react"
import { ZoomableImage } from "@/components/ui/zoomable-image"
import type { VenueMedia } from "@prisma/client"

interface GalleryItem {
  url: string
  type: "IMAGE" | "VIDEO"
  caption?: string | null
}

interface VenueMediaGalleryProps {
  media: VenueMedia[]
  coverImage?: string
}

export function VenueMediaGallery({ media, coverImage }: VenueMediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Build ordered items: cover image first (if provided & not already in media), then media images, then videos
  const allItems: GalleryItem[] = []
  const images = media.filter((m) => m.type === "IMAGE")
  const videos = media.filter((m) => m.type === "VIDEO")

  if (coverImage) {
    allItems.push({ url: coverImage, type: "IMAGE", caption: null })
  }
  for (const img of images) {
    if (img.url !== coverImage) {
      allItems.push({ url: img.url, type: img.type as "IMAGE", caption: img.caption })
    }
  }
  for (const vid of videos) {
    allItems.push({ url: vid.url, type: "VIDEO", caption: vid.caption })
  }

  const imageItems = allItems.filter(i => i.type === "IMAGE")

  // Listen for external trigger to open lightbox (e.g. hero image click)
  useEffect(() => {
    function onOpenGallery() {
      if (allItems.length > 0) setLightboxIndex(0)
    }
    window.addEventListener("open-gallery-lightbox", onOpenGallery)
    return () => window.removeEventListener("open-gallery-lightbox", onOpenGallery)
  }, [allItems.length])

  // Scroll thumbnail into view when lightbox index changes
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
    setLightboxIndex((lightboxIndex - 1 + allItems.length) % allItems.length)
  }, [lightboxIndex, allItems.length])

  const next = useCallback(() => {
    if (lightboxIndex === null) return
    setLightboxIndex((lightboxIndex + 1) % allItems.length)
  }, [lightboxIndex, allItems.length])

  // Push history state when lightbox opens, close on popstate (mobile back button)
  useEffect(() => {
    if (lightboxIndex !== null) {
      window.history.pushState({ lightbox: true }, "")
    }
  }, [lightboxIndex !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      if (lightboxIndex !== null) {
        e.preventDefault()
        setLightboxIndex(null)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [lightboxIndex])

  // Keyboard navigation
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

  if (!allItems.length) return null

  // Grid: show up to 6 images in preview (2 rows of 3)
  const gridImages = imageItems.slice(0, 6)
  const totalExtra = allItems.length - gridImages.length

  // Columns: 1 photo → 1 col, 2 → 2 cols, 3+ → 2 cols mobile / 3 cols desktop
  const colsClass = gridImages.length === 1 ? "grid-cols-1" : gridImages.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">
            {imageItems.length} photo{imageItems.length !== 1 ? "s" : ""}
            {videos.length > 0 ? ` & ${videos.length} video${videos.length !== 1 ? "s" : ""}` : ""}
          </h3>
        </div>

        {/* Image grid preview - 3 per row */}
        {gridImages.length > 0 && (
          <div className={`grid gap-2 ${colsClass}`}>
            {gridImages.map((img, i) => {
              const globalIdx = allItems.indexOf(img)
              const isLast = i === gridImages.length - 1 && totalExtra > 0
              return (
                <div
                  key={img.url + i}
                  className="relative rounded-lg overflow-hidden border border-border bg-muted cursor-pointer group aspect-video"
                  onClick={() => setLightboxIndex(globalIdx)}
                >
                  <Image src={img.url} alt={img.caption || "venue photo"} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    {isLast ? (
                      <span className="text-white font-semibold text-lg bg-black/60 rounded-full px-4 py-1">+{totalExtra}</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightboxIndex(null)}>
          {/* Close */}
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-20" onClick={() => setLightboxIndex(null)}>
            <X className="h-8 w-8" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/60 text-sm z-20">
            {lightboxIndex + 1} / {allItems.length}
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* Left arrow */}
            {allItems.length > 1 && (
              <button
                className="absolute left-2 sm:left-4 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); prev() }}
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}

            {/* Image/video */}
            <div className="relative w-full h-full max-w-5xl mx-12 sm:mx-20" onClick={(e) => e.stopPropagation()}>
              {allItems[lightboxIndex]?.type === "IMAGE" ? (
                <ZoomableImage
                  src={allItems[lightboxIndex].url}
                  alt={allItems[lightboxIndex].caption || "venue photo"}
                />
              ) : (
                <video
                  src={allItems[lightboxIndex].url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Right arrow */}
            {allItems.length > 1 && (
              <button
                className="absolute right-2 sm:right-4 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); next() }}
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {allItems.length > 1 && (
            <div className="shrink-0 py-3 px-4" onClick={(e) => e.stopPropagation()}>
              <div
                ref={thumbStripRef}
                className="flex gap-2 overflow-x-auto justify-center scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {allItems.map((item, i) => (
                  <button
                    key={item.url + i}
                    onClick={() => setLightboxIndex(i)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === lightboxIndex
                        ? "border-[#e8a840] ring-1 ring-[#e8a840] opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {item.type === "IMAGE" ? (
                      <Image src={item.url} alt="" fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/60 text-xs">
                        Video
                      </div>
                    )}
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
