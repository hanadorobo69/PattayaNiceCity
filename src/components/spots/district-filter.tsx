"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"
import { DISTRICTS } from "@/lib/districts"

export function DistrictFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeDistricts = new Set((searchParams.get("district") ?? "").split(",").filter(Boolean))

  const handleClick = useCallback((districtId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const current = new Set((params.get("district") ?? "").split(",").filter(Boolean))
    if (current.has(districtId)) {
      current.delete(districtId)
    } else {
      current.add(districtId)
    }
    if (current.size > 0) {
      params.set("district", [...current].join(","))
    } else {
      params.delete("district")
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, router, pathname])

  return (
    <>
      {DISTRICTS.map((d) => (
        <button
          key={d.id}
          onClick={() => handleClick(d.id)}
          className={`shrink-0 whitespace-nowrap category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeDistricts.has(d.id)
              ? "bg-gradient-to-r from-[#3db8a0] to-[#e07850] text-white shadow-[0_0_12px_rgba(61,184,160,0.3)]"
              : "glass-card text-muted-foreground"
          }`}
        >
          <span aria-hidden="true">📍</span> {d.label}
        </button>
      ))}
    </>
  )
}
