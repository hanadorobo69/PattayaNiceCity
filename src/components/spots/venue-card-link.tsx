"use client"

import { Link } from "@/i18n/navigation"
import { useCallback } from "react"

interface VenueCardLinkProps {
  venueId: string
  href: string
  children: React.ReactNode
}

export function VenueCardLink({ venueId, href, children }: VenueCardLinkProps) {
  const onEnter = useCallback(() => {
    window.dispatchEvent(new CustomEvent("highlight-venue", { detail: { venueId } }))
  }, [venueId])

  const onLeave = useCallback(() => {
    window.dispatchEvent(new CustomEvent("highlight-venue", { detail: { venueId: null } }))
  }, [])

  return (
    <Link
      href={href}
      className="venue-card group block rounded-xl glass-card overflow-hidden"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </Link>
  )
}
