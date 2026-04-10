import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const GIPHY_KEY = process.env.GIPHY_API_KEY

export async function GET(req: NextRequest) {
  if (!GIPHY_KEY) {
    return NextResponse.json({ results: [], next: "" })
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const rl = rateLimit(`gifs:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ results: [], next: "" })
  }

  const q = req.nextUrl.searchParams.get("q") ?? ""
  const offset = req.nextUrl.searchParams.get("offset") ?? "0"

  const params = new URLSearchParams({
    api_key: GIPHY_KEY,
    limit: "20",
    offset,
    rating: "r",
  })

  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?${params}&q=${encodeURIComponent(q)}`
    : `https://api.giphy.com/v1/gifs/trending?${params}`

  try {
    const res = await fetch(endpoint, { next: { revalidate: 120 } })
    const data = await res.json()

    const results = (data.data ?? []).map((g: any) => ({
      id: g.id,
      title: g.title || "",
      // Use small webp for fast preview, fixed_height gif for actual insert
      preview: g.images?.fixed_height_small?.webp
        ?? g.images?.fixed_height_small?.url
        ?? g.images?.fixed_height?.webp
        ?? g.images?.fixed_height?.url
        ?? "",
      url: g.images?.fixed_height?.url
        ?? g.images?.original?.url
        ?? "",
      width: parseInt(g.images?.fixed_height?.width ?? "200"),
      height: parseInt(g.images?.fixed_height?.height ?? "200"),
    }))

    const pagination = data.pagination ?? {}
    const currentOffset = pagination.offset ?? 0
    const count = pagination.count ?? 0
    const total = pagination.total_count ?? 0
    const nextOffset = currentOffset + count < total ? String(currentOffset + count) : ""

    return NextResponse.json({ results, next: nextOffset })
  } catch {
    return NextResponse.json({ results: [], next: "" })
  }
}
