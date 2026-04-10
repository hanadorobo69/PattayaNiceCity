import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get("title") || ""
  const category = searchParams.get("category") || ""
  const readingTime = searchParams.get("readingTime") || ""

  // Default homepage preview (no title param)
  if (!title) {
    let logoSrc = ""
    try {
      const logoData = await readFile(join(process.cwd(), "public/assets/about/logo_noreflect.png"))
      logoSrc = `data:image/png;base64,${logoData.toString("base64")}`
    } catch {}

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0b15 0%, #1a0d2e 30%, #2d1045 60%, #0f0b15 100%)",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Gradient line top */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8a840, #e07850, #3db8a0)", display: "flex" }} />

          {/* Glow effects */}
          <div style={{ position: "absolute", top: "20%", left: "30%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(224,120,80,0.15) 0%, transparent 70%)", display: "flex" }} />
          <div style={{ position: "absolute", bottom: "20%", right: "25%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(232,168,64,0.1) 0%, transparent 70%)", display: "flex" }} />

          {/* Logo */}
          {logoSrc && (
            <img src={logoSrc} width={420} height={170} style={{ objectFit: "contain" }} />
          )}

          {/* Tagline */}
          <div style={{ display: "flex", marginTop: "24px", fontSize: "28px", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>
            Your Complete Pattaya Guide
          </div>

          {/* Sub text */}
          <div style={{ display: "flex", marginTop: "16px", fontSize: "18px", color: "rgba(255,255,255,0.4)", gap: "20px" }}>
            <span>🍽️ Restaurants</span>
            <span>🏖️ Beaches</span>
            <span>🏛️ Temples</span>
            <span>👨‍👩‍👧‍👦 Family</span>
            <span>⭐ Real Reviews</span>
          </div>

          {/* Bottom gradient line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8a840, #e07850, #3db8a0)", display: "flex" }} />
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // Post/page-specific OG image
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "linear-gradient(135deg, #0f0b15 0%, #1a0d2e 40%, #0f0b15 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar with gradient line */}
        <div style={{ display: "flex", width: "100%", height: "4px", background: "linear-gradient(90deg, #e8a840, #e07850, #3db8a0)", borderRadius: "2px" }} />

        {/* Category badge */}
        {category && (
          <div style={{ display: "flex", marginTop: "30px" }}>
            <span style={{ padding: "6px 16px", borderRadius: "20px", fontSize: "18px", fontWeight: 600, color: "#e07850", border: "1px solid rgba(224, 120, 80, 0.4)", background: "rgba(224, 120, 80, 0.15)" }}>
              {category}
            </span>
          </div>
        )}

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: category ? "0" : "40px" }}>
          <h1 style={{ fontSize: title.length > 60 ? "42px" : "52px", fontWeight: 800, lineHeight: 1.2, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
            {title}
          </h1>
        </div>

        {/* Bottom bar: branding + reading time */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "20px", color: "white", background: "linear-gradient(135deg, #e8a840, #e07850)" }}>
              P
            </div>
            <span style={{ fontSize: "22px", fontWeight: 700, background: "linear-gradient(90deg, #e8a840, #e07850, #3db8a0)", backgroundClip: "text", color: "transparent" }}>
              Pattaya Nice City
            </span>
          </div>
          {readingTime && (
            <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)" }}>
              {readingTime} min read
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
