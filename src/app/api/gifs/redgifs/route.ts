import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

let cachedToken: { value: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value

  const res = await fetch("https://api.redgifs.com/v2/auth/temporary", {
    headers: { "User-Agent": "PattayaNiceCity/1.0" },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Auth failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  const token = data.token as string
  if (!token) throw new Error("No token in auth response")
  cachedToken = { value: token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }
  return token
}

async function fetchGifs(q: string, page: string, token: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "PattayaNiceCity/1.0",
  }

  // Build search URL - RedGIFs trending endpoint is broken, use search instead
  const params = new URLSearchParams({
    count: "20",
    page,
    order: "trending",
  })

  // If no query, use a broad NSFW term to get popular content
  const searchText = q || "hot"
  const endpoint = `https://api.redgifs.com/v2/gifs/search?search_text=${encodeURIComponent(searchText)}&${params}`

  const res = await fetch(endpoint, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const rl = rateLimit(`redgifs:${ip}`, 20, 60_000)
  if (!rl.ok) return NextResponse.json({ results: [], hasMore: false, nextPage: "" })

  const q = req.nextUrl.searchParams.get("q") ?? ""
  const page = req.nextUrl.searchParams.get("page") ?? "1"

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await getToken()
      const data = await fetchGifs(q, page, token)

      const gifs = data.gifs ?? []

      const results = gifs.map((g: any) => ({
        id: g.id,
        title: g.tags?.slice(0, 3).join(", ") ?? "",
        // Use multiple fallbacks for thumbnail URLs
        preview: g.urls?.thumbnail ?? g.urls?.poster ?? g.urls?.vthumbnail ?? "",
        // sd mp4 is the main video URL to embed
        url: g.urls?.sd ?? g.urls?.hd ?? g.urls?.gif ?? "",
        isVideo: true,
      }))

      const totalPages = data.pages ?? 1
      const currentPage = parseInt(page)

      return NextResponse.json({
        results,
        hasMore: currentPage < totalPages,
        nextPage: currentPage < totalPages ? String(currentPage + 1) : "",
      })
    } catch (err) {
      // On first failure, invalidate token and retry
      cachedToken = null
      if (attempt === 1) {
        console.error("[RedGIFs] API error after retry:", err)
        return NextResponse.json({
          results: [],
          hasMore: false,
          nextPage: "",
        })
      }
    }
  }

  return NextResponse.json({ results: [], hasMore: false, nextPage: "" })
}
