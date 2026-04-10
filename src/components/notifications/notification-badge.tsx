"use client"

import { useEffect, useState } from "react"

export function NotificationBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications")
        const data = await res.json()
        if (mounted) setCount(data.count ?? 0)
      } catch {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#e8a840] text-white text-[9px] font-bold leading-none shadow-[0_0_8px_rgba(232,168,64,0.5)]">
      {count > 99 ? "99+" : count}
    </span>
  )
}
