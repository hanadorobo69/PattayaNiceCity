"use client"

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ScrollableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", check); ro.disconnect() }
  }, [check])

  return (
    <div className="relative">
      <div ref={ref} className={`flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}>
        {children}
      </div>
      {canLeft && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none z-10">
          <div className="w-8 h-full bg-gradient-to-r from-[rgba(26,21,16,0.95)] to-transparent flex items-center pl-0.5">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
      {canRight && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none z-10">
          <div className="w-8 h-full bg-gradient-to-l from-[rgba(26,21,16,0.95)] to-transparent flex items-center justify-end pr-0.5">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  )
}
