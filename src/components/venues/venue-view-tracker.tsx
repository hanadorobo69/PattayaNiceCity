"use client"

import { useEffect, useRef } from "react"
import { trackVenueView } from "@/actions/analytics"

export function VenueViewTracker({ venueId }: { venueId: string }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackVenueView(venueId)
  }, [venueId])

  return null
}
