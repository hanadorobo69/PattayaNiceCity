import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import sharp from "sharp"

const UPLOAD_BASE = join(process.cwd(), "data", "uploads")

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"]
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/avi", "video/mov"]
const DOC_TYPES = ["application/pdf"]

const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_DOC_SIZE = 20 * 1024 * 1024    // 20MB

function getFileCategory(mime: string): { type: "IMAGE" | "VIDEO" | "PDF"; folder: string; maxSize: number } | null {
  if (IMAGE_TYPES.includes(mime)) return { type: "IMAGE", folder: "images", maxSize: MAX_IMAGE_SIZE }
  if (VIDEO_TYPES.includes(mime)) return { type: "VIDEO", folder: "videos", maxSize: MAX_VIDEO_SIZE }
  if (DOC_TYPES.includes(mime)) return { type: "PDF", folder: "docs", maxSize: MAX_DOC_SIZE }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = rateLimit(`upload:${session.user.id}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const category = getFileCategory(file.type)
    if (!category) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: images (JPG/PNG/WebP/GIF), videos (MP4/WebM/MOV), PDFs." }, { status: 400 })
    }

    if (file.size > category.maxSize) {
      const limitMB = category.maxSize / (1024 * 1024)
      return NextResponse.json({ error: `File too large. Max size for ${category.type.toLowerCase()}: ${limitMB}MB` }, { status: 400 })
    }

    const uploadDir = join(UPLOAD_BASE, category.folder)
    await mkdir(uploadDir, { recursive: true })

    const ALLOWED_EXT: Record<string, string[]> = {
      IMAGE: ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"],
      VIDEO: ["mp4", "webm", "mov", "avi"],
      PDF: ["pdf"],
    }
    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? ""
    const allowed = ALLOWED_EXT[category.type] ?? []
    const ext = allowed.includes(rawExt) ? rawExt : allowed[0]
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = join(uploadDir, safeName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Convert HEIC/HEIF to WebP for browser compatibility
    const isHeic = ["heic", "heif"].includes(ext)
    let finalName = safeName
    let finalPath = filepath
    let finalBuffer = buffer

    if (isHeic) {
      finalName = safeName.replace(/\.(heic|heif)$/, ".webp")
      finalPath = join(uploadDir, finalName)
      finalBuffer = Buffer.from(await sharp(buffer).webp({ quality: 85 }).toBuffer())
    }

    await writeFile(finalPath, finalBuffer)

    return NextResponse.json({
      url: `/uploads/${category.folder}/${finalName}`,
      type: category.type,
      filename: file.name,
      size: finalBuffer.length,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
