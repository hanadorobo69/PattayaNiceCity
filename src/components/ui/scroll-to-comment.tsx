"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export function ScrollToComment() {
  const searchParams = useSearchParams()
  const commentId = searchParams.get("comment")

  useEffect(() => {
    if (!commentId) return
    // Delay to ensure DOM is rendered (tabs opened, comments loaded)
    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${commentId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [commentId])

  return null
}
