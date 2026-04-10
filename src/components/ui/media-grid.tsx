"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { FileText, X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"
import { ZoomableImage } from "@/components/ui/zoomable-image"

export interface MediaGridItem {
  url: string
  type: string // "IMAGE" | "VIDEO" | "PDF"
  filename?: string | null
  size?: number | null
}

interface MediaGridProps {
  items: MediaGridItem[]
  className?: string
}

export function MediaGrid({ items, className }: MediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  if (!items.length) return null

  // Separate GIFs (filename === "gif") from regular media
  const gifs = items.filter((i) => i.filename === "gif")
  const regularItems = items.filter((i) => i.filename !== "gif")

  const images = regularItems.filter((i) => i.type === "IMAGE")
  const videos = regularItems.filter((i) => i.type === "VIDEO")
  const pdfs = regularItems.filter((i) => i.type === "PDF")

  const prevImage = useCallback(() => {
    if (lightboxIndex === null || images.length <= 1) return
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)
  }, [lightboxIndex, images.length])

  const nextImage = useCallback(() => {
    if (lightboxIndex === null || images.length <= 1) return
    setLightboxIndex((lightboxIndex + 1) % images.length)
  }, [lightboxIndex, images.length])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage()
      else prevImage()
    }
  }, [nextImage, prevImage])

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {/* GIFs - inline, auto-playing, separate from photos */}
      {gifs.map((gif, i) => (
        <div key={`gif-${i}`} className="rounded-lg overflow-hidden border border-[rgba(232,168,64,0.20)] bg-black max-w-md inline-block">
          {gif.type === "VIDEO" ? (
            <video
              src={gif.url}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              className="w-full max-h-[300px] object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={gif.url}
              alt="GIF"
              className="w-full max-h-[300px] object-contain"
            />
          )}
        </div>
      ))}

      {/* Image grid - Reddit-style: constrained max height, rounded, compact */}
      {images.length > 0 && (
        <div className={`grid gap-1.5 ${images.length === 1 ? "grid-cols-1 max-w-lg" : images.length === 2 ? "grid-cols-2 max-w-2xl" : "grid-cols-2 sm:grid-cols-3 max-w-2xl"}`}>
          {images.map((img, i) => (
            <div
              key={i}
              className={`relative rounded-lg overflow-hidden border border-[rgba(232,168,64,0.20)] bg-muted cursor-pointer group ${images.length === 1 ? "aspect-video max-h-[400px]" : "aspect-square max-h-[240px]"}`}
              onClick={() => setLightboxIndex(i)}
            >
              <Image src={img.url} alt={img.filename || "image"} fill className="object-cover transition-transform group-hover:scale-105" sizes={images.length === 1 ? "512px" : "256px"} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Videos - constrained, compact player */}
      {videos.map((vid, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-[rgba(232,168,64,0.20)] bg-black max-w-lg">
          <video
            src={vid.url}
            controls
            preload="metadata"
            className="w-full max-h-[360px] object-contain"
          />
        </div>
      ))}

      {/* PDFs */}
      {pdfs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pdfs.map((pdf, i) => (
            <a
              key={i}
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted hover:bg-[rgba(75,35,120,0.32)] transition-colors text-sm"
            >
              <FileText className="h-4 w-4 text-red-500 shrink-0" />
              <span className="max-w-[180px] truncate">{pdf.filename || "Document.pdf"}</span>
            </a>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-20"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-8 w-8" />
          </button>
          {images.length > 1 && (
            <div className="absolute top-4 left-4 text-white/60 text-sm z-20">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {images.length > 1 && (
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); prevImage() }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
              <ZoomableImage
                src={images[lightboxIndex].url}
                alt="Full size"
              />
            </div>
            {images.length > 1 && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                onClick={(e) => { e.stopPropagation(); nextImage() }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
