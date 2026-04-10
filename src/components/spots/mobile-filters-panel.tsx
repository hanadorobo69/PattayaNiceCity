"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react"

interface MobileFiltersPanelProps {
  children: React.ReactNode
  activeCount?: number
}

export function MobileFiltersPanel({ children, activeCount = 0 }: MobileFiltersPanelProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("mobileFilters")

  return (
    <div>
      {/* Toggle button - mobile only */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden flex items-center gap-2 w-full px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border border-[rgba(61,184,160,0.25)] bg-[rgba(61,184,160,0.04)] hover:bg-[rgba(61,184,160,0.10)] text-[#3db8a0]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>{t("filters")}</span>
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8a840] text-white leading-none">
            {activeCount}
          </span>
        )}
        <span className="ml-auto">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Desktop: always visible */}
      <div className="hidden lg:block">
        {children}
      </div>

      {/* Mobile: collapsible */}
      {open && (
        <div className="lg:hidden mt-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
