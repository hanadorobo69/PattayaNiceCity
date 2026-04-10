import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { auth } from "@/auth"

const UPLOAD_BASE = join(process.cwd(), "data", "uploads", "images")

/**
 * Fetches a Google Places photo by its resource name, saves it locally,
 * and returns the local URL. Requires authentication.
 *
 * GET /api/places-photo?name=places/PLACE_ID/photos/PHOTO_REF
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const photoName = req.nextUrl.searchParams.get("name")
  const apiKey = process.env.GOOGLE_MAPS_KEY
  if (!photoName || !apiKey) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    // Get the photo URI from Google (skip redirect to get JSON with photoUri)
    const metaRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey } }
    )
    const meta = await metaRes.json()
    if (!meta.photoUri) {
      return NextResponse.json({ error: "No photo URI" }, { status: 404 })
    }

    // Download the actual image
    const imgRes = await fetch(meta.photoUri)
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to download photo" }, { status: 502 })
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg"
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    // Save to local filesystem
    await mkdir(UPLOAD_BASE, { recursive: true })
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = join(UPLOAD_BASE, filename)
    await writeFile(filepath, buffer)

    const url = `/uploads/images/${filename}`

    return NextResponse.json({
      url,
      type: "IMAGE",
      filename,
      size: buffer.length,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 })
  }
}
