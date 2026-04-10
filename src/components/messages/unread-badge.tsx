"use client"

import { useState, useEffect, useCallback } from "react"

export function UnreadBadge() {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread")
      if (res.ok) {
        const data = await res.json()
        setCount(data.count || 0)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchCount()
    }, 15_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  if (count === 0) return null

  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#e8a840] text-white text-[10px] font-bold px-1 shadow-[0_0_8px_rgba(232,168,64,0.5)]">
      {count > 99 ? "99+" : count}
    </span>
  )
}
