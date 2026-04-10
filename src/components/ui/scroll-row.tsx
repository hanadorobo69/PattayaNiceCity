"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ScrollRow({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = () => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [])

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center justify-start pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(12,8,26,1) 0%, transparent 100%)" }}>
          <ChevronLeft className="h-4 w-4 text-[#e8a840] ml-0.5" />
        </div>
      )}
      <div ref={ref} className={`flex items-center gap-2 overflow-x-auto scrollbar-hide ${className ?? ""}`}>
        {children}
      </div>
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 flex items-center justify-end pointer-events-none"
          style={{ background: "linear-gradient(to left, rgba(12,8,26,1) 0%, transparent 100%)" }}>
          <ChevronRight className="h-4 w-4 text-[#e8a840] mr-0.5" />
        </div>
      )}
    </div>
  )
}
