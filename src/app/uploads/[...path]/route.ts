import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { join, extname, resolve, relative } from "path"

const DATA_UPLOADS = join(process.cwd(), "data", "uploads")
const PUBLIC_UPLOADS = join(process.cwd(), "public", "uploads")

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
}

function isSafePath(base: string, target: string): boolean {
  const resolved = resolve(base, target)
  const rel = relative(base, resolved)
  return !rel.startsWith("..") && !rel.startsWith("/")
}

async function tryRead(filepath: string): Promise<Buffer | null> {
  try {
    await stat(filepath)
    return await readFile(filepath)
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const safePath = path.map(s => s.replace(/[^a-zA-Z0-9._-]/g, "")).join("/")

  // Verify resolved path stays within upload directories
  if (!isSafePath(DATA_UPLOADS, safePath) && !isSafePath(PUBLIC_UPLOADS, safePath)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // Try data/uploads first (new uploads), then public/uploads (legacy)
  let data = await tryRead(join(DATA_UPLOADS, safePath))
  if (!data) data = await tryRead(join(PUBLIC_UPLOADS, safePath))
  if (!data) return new NextResponse("Not found", { status: 404 })

  const ext = extname(safePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || "application/octet-stream"

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
