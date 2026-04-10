import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * Facebook Data Deletion Callback
 * Facebook sends a POST with a signed_request when a user requests data deletion.
 * We must respond with a JSON containing a confirmation URL and code.
 * See: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

function parseSignedRequest(signedRequest: string, secret: string) {
  const [encodedSig, payload] = signedRequest.split(".")
  if (!encodedSig || !payload) return null

  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64")
  const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"))

  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest()
  if (!crypto.timingSafeEqual(sig, expectedSig)) return null

  return data
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const signedRequest = formData.get("signed_request") as string
    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 })
    }

    const secret = process.env.AUTH_FACEBOOK_SECRET
    if (!secret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const data = parseSignedRequest(signedRequest, secret)
    if (!data || !data.user_id) {
      return NextResponse.json({ error: "Invalid signed request" }, { status: 400 })
    }

    const facebookUserId = data.user_id as string

    // Find and soft-delete the user's data
    const profile = await prisma.profile.findFirst({
      where: { facebookId: facebookUserId },
    })

    if (profile) {
      // Soft-delete user content (same as account deletion)
      await prisma.$transaction([
        prisma.post.updateMany({ where: { authorId: profile.id }, data: { deletedAt: new Date() } }),
        prisma.comment.updateMany({ where: { authorId: profile.id }, data: { deletedAt: new Date() } }),
        prisma.vote.deleteMany({ where: { userId: profile.id } }),
        prisma.commentVote.deleteMany({ where: { userId: profile.id } }),
        prisma.notification.deleteMany({ where: { OR: [{ recipientId: profile.id }, { actorId: profile.id }] } }),
        prisma.venueFavorite.deleteMany({ where: { userId: profile.id } }),
        prisma.venueRating.deleteMany({ where: { userId: profile.id } }),
        prisma.profile.delete({ where: { id: profile.id } }),
      ])
    }

    // Generate a confirmation code
    const confirmationCode = crypto.randomUUID()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

    return NextResponse.json({
      url: `${baseUrl}/legal`,
      confirmation_code: confirmationCode,
    })
  } catch (error) {
    console.error("Facebook data deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
