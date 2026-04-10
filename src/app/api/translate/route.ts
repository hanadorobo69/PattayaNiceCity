import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTranslation, type EntityType } from "@/lib/translation";
import { isValidLocale } from "@/i18n/config";
import { rateLimit } from "@/lib/rate-limit";

const VALID_ENTITY_TYPES = new Set([
  "post", "comment", "venue_comment", "venue",
]);

const VALID_FIELDS = new Set(["title", "content", "description", "comment"]);

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP to prevent API abuse
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`translate:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many translation requests" }, { status: 429 });
    }

    const body = await req.json();
    const { entityType, entityId, field, sourceText, sourceLanguage, targetLanguage } = body;

    // Validate
    if (!entityType || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }
    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json({ error: "Invalid entityId" }, { status: 400 });
    }
    if (!field || !VALID_FIELDS.has(field)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }
    if (!sourceText || typeof sourceText !== "string") {
      return NextResponse.json({ error: "Invalid sourceText" }, { status: 400 });
    }
    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json({ error: "Missing language" }, { status: 400 });
    }
    if (!isValidLocale(targetLanguage)) {
      return NextResponse.json({ error: "Invalid target language" }, { status: 400 });
    }

    const result = await getOrCreateTranslation({
      entityType: entityType as EntityType,
      entityId,
      field,
      sourceText,
      sourceLanguage,
      targetLanguage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
