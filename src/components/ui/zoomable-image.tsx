"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Image from "next/image"

interface ZoomableImageProps {
  src: string
  alt: string
}

const MIN_SCALE = 1
const MAX_SCALE = 5
const ZOOM_STEP = 0.3

/**
 * Zoomable image for lightboxes.
 * - Desktop: scroll wheel to zoom, click-drag to pan
 * - Mobile: pinch to zoom, drag to pan, double-tap to toggle zoom
 */
export function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })

  // Drag state
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  // Pinch state
  const lastPinchDist = useRef<number | null>(null)
  const pinchMidpoint = useRef({ x: 0, y: 0 })

  // Double-tap state
  const lastTap = useRef(0)

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [src])

  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 }
    const el = containerRef.current
    if (!el) return { x: tx, y: ty }
    const rect = el.getBoundingClientRect()
    // Max pan = (scaled size - container size) / 2
    const maxX = Math.max(0, (rect.width * s - rect.width) / 2)
    const maxY = Math.max(0, (rect.height * s - rect.height) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    }
  }, [])

  // ── Wheel zoom (desktop) ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setScale(prev => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta))
      if (next <= 1) setTranslate({ x: 0, y: 0 })
      else setTranslate(t => clampTranslate(t.x, t.y, next))
      return next
    })
  }, [clampTranslate])

  // ── Mouse drag (desktop pan) ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    translateStart.current = { ...translate }
  }, [scale, translate])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setTranslate(clampTranslate(translateStart.current.x + dx, translateStart.current.y + dy, scale))
  }, [scale, clampTranslate])

  const onMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  // ── Touch: pinch-to-zoom + drag pan + double-tap ──
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
      pinchMidpoint.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now()
      if (now - lastTap.current < 300) {
        // Double tap: toggle zoom
        if (scale > 1) {
          setScale(1)
          setTranslate({ x: 0, y: 0 })
        } else {
          setScale(3)
        }
        lastTap.current = 0
        return
      }
      lastTap.current = now

      // Single finger drag (pan when zoomed)
      if (scale > 1) {
        dragging.current = true
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        translateStart.current = { ...translate }
      }
    }
  }, [scale, translate])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (lastPinchDist.current !== null) {
        const ratio = dist / lastPinchDist.current
        setScale(prev => {
          const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * ratio))
          if (next <= 1) setTranslate({ x: 0, y: 0 })
          return next
        })
      }
      lastPinchDist.current = dist
      // Prevent navigation swipe while pinching
      if (scale > 1) e.stopPropagation()
    } else if (e.touches.length === 1 && dragging.current) {
      // Pan
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setTranslate(clampTranslate(translateStart.current.x + dx, translateStart.current.y + dy, scale))
      if (scale > 1) e.stopPropagation()
    }
  }, [scale, clampTranslate])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) lastPinchDist.current = null
    if (e.touches.length === 0) dragging.current = false
  }, [])

  const isZoomed = scale > 1

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{ cursor: isZoomed ? "grab" : "zoom-in", touchAction: isZoomed ? "none" : "pan-y" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="relative w-full h-full transition-transform duration-75"
        style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain pointer-events-none"
          sizes="100vw"
          draggable={false}
        />
      </div>
      {/* Zoom indicator */}
      {isZoomed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white/80 text-xs font-medium pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  )
}
