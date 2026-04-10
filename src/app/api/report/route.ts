import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth/session"
import { rateLimit } from "@/lib/rate-limit"

const VALID_CONTENT_TYPES = new Set(["post", "comment", "venue_comment", "girl_comment", "venue", "girl", "event", "message"])
const VALID_REASONS = new Set(["spam", "harassment", "inappropriate", "misinformation", "scam", "other"])

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = rateLimit(`report:${userId}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many reports. Please wait." }, { status: 429 })
  }

  const body = await req.json()
  const { contentType, contentId, reason, details } = body

  if (!contentType || !contentId || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (!VALID_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
  }

  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 })
  }

  if (typeof contentId !== "string" || contentId.length > 100) {
    return NextResponse.json({ error: "Invalid content ID" }, { status: 400 })
  }

  if (details && (typeof details !== "string" || details.length > 1000)) {
    return NextResponse.json({ error: "Details too long" }, { status: 400 })
  }

  try {
    await prisma.contentReport.create({
      data: {
        reporterId: userId,
        contentType,
        contentId,
        reason,
        details: details || null,
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
