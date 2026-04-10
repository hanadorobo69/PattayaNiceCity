"use client"

import { useRef, useCallback, useEffect } from "react"

const THRESHOLD = 80 // px to pull before triggering refresh

export function PullToRefresh() {
  const startY = useRef(0)
  const isTracking = useRef(false)
  const currentPull = useRef(0)

  const canPull = useCallback(() => {
    return window.scrollY <= 0
  }, [])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!canPull()) return
      startY.current = e.touches[0].clientY
      isTracking.current = true
      currentPull.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (!isTracking.current) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0 && canPull()) {
        currentPull.current = diff * 0.4
      } else {
        currentPull.current = 0
      }
    }

    function onTouchEnd() {
      if (!isTracking.current) return
      isTracking.current = false
      if (currentPull.current >= THRESHOLD) {
        window.location.reload()
      }
      currentPull.current = 0
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [canPull])

  return null
}
