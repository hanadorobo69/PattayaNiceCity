"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import { headers } from "next/headers"

export async function trackVenueView(venueId: string) {
  try {
    const userId = await getCurrentUserId()
    await prisma.venueView.create({
      data: { venueId, userId },
    })
  } catch {
    // silently fail - analytics should never break the page
  }
}

function getClientIp(hdrs: Headers): string | null {
  // x-forwarded-for can be comma-separated; take the first (client) IP
  const xff = hdrs.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0].trim()
    if (first && first !== "::1" && first !== "127.0.0.1") return first
  }
  const realIp = hdrs.get("x-real-ip")
  if (realIp && realIp !== "::1" && realIp !== "127.0.0.1") return realIp
  return null
}

// Simple in-memory cache for IP geolocation (5 min TTL)
const geoCache = new Map<string, { country: string | null; city: string | null; region: string | null; ts: number }>()
const GEO_TTL = 5 * 60 * 1000

async function geolocateIp(ip: string): Promise<{ country: string | null; city: string | null; region: string | null }> {
  const cached = geoCache.get(ip)
  if (cached && Date.now() - cached.ts < GEO_TTL) {
    return { country: cached.country, city: cached.city, region: cached.region }
  }

  try {
    // Use ip-api.com free endpoint (non-commercial, 45 req/min)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.status === "success") {
        const result = { country: data.country || null, city: data.city || null, region: data.regionName || null }
        geoCache.set(ip, { ...result, ts: Date.now() })
        // Clean cache if too large
        if (geoCache.size > 5000) {
          const oldest = [...geoCache.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 2500)
          for (const [key] of oldest) geoCache.delete(key)
        }
        return result
      }
    }
  } catch {
    // Geolocation failure should not block tracking
  }
  return { country: null, city: null, region: null }
}

export async function trackPageView(path: string) {
  try {
    // Skip admin pages from analytics
    if (path.startsWith("/admin")) return

    const [userId, hdrs] = await Promise.all([
      getCurrentUserId(),
      headers(),
    ])
    const referrer = hdrs.get("referer") || null
    const userAgent = hdrs.get("user-agent") || null
    const ip = getClientIp(hdrs)

    // Geolocate in background - don't block the page view insert
    let country: string | null = null
    let city: string | null = null
    let region: string | null = null

    if (ip) {
      const geo = await geolocateIp(ip)
      country = geo.country
      city = geo.city
      region = geo.region
    }

    await prisma.pageView.create({
      data: { path, userId, referrer, userAgent, ip, country, city, region },
    })
  } catch {
    // silently fail
  }
}
