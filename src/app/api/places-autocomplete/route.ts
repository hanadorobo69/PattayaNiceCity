import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ predictions: [] })
  }

  const rl = rateLimit(`places:${session.user.id}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ predictions: [] })
  }

  const input = req.nextUrl.searchParams.get("input")
  const apiKey = process.env.GOOGLE_MAPS_KEY
  if (!input || !apiKey) return NextResponse.json({ predictions: [] })

  try {
    // Places API (New) - Autocomplete endpoint
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["th"],
        languageCode: "en",
      }),
    })
    const data = await res.json()
    const predictions = (data.suggestions ?? [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text?.text ?? s.placePrediction.structuredFormat?.mainText?.text ?? "",
      }))
    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ predictions: [] })
  }
}
