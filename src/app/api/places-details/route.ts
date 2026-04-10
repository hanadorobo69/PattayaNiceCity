import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = rateLimit(`place-details:${session.user.id}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const placeId = req.nextUrl.searchParams.get("place_id")
  const apiKey = process.env.GOOGLE_MAPS_KEY
  if (!placeId || !apiKey) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  try {
    // Places API (New) - Place Details endpoint (photos is an Advanced field)
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "location,formattedAddress,addressComponents,photos,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours",
      },
    })
    const data = await res.json()
    if (data.location) {
      // Extract district/neighborhood from address components
      const components = data.addressComponents ?? []
      const district = components.find((c: any) =>
        c.types?.includes("sublocality_level_1") || c.types?.includes("sublocality") || c.types?.includes("neighborhood")
      )?.longText ?? null

      // Extract first 10 photo references
      const photos = (data.photos ?? []).slice(0, 10).map((p: any) => p.name)

      // Extract phone number
      const phone = data.internationalPhoneNumber ?? data.nationalPhoneNumber ?? null

      // Extract website
      const website = data.websiteUri ?? null

      // Extract opening hours into our WeekSchedule format
      let hours: Record<string, { open: string; close: string; closed: boolean }> | null = null
      if (data.regularOpeningHours?.periods?.length) {
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
        hours = {}
        // Init all days as closed
        for (const d of dayMap) hours[d] = { open: "00:00", close: "00:00", closed: true }
        for (const p of data.regularOpeningHours.periods) {
          const openDay = dayMap[p.open?.day ?? 0]
          if (openDay && p.open) {
            const oh = String(p.open.hour ?? 0).padStart(2, "0")
            const om = String(p.open.minute ?? 0).padStart(2, "0")
            const ch = String(p.close?.hour ?? 0).padStart(2, "0")
            const cm = String(p.close?.minute ?? 0).padStart(2, "0")
            hours[openDay] = { open: `${oh}:${om}`, close: `${ch}:${cm}`, closed: false }
          }
        }
      }

      return NextResponse.json({
        lat: data.location.latitude,
        lng: data.location.longitude,
        address: data.formattedAddress ?? null,
        district,
        photos,
        phone,
        website,
        hours,
      })
    }
    return NextResponse.json({ error: "No location found" }, { status: 404 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 })
  }
}
