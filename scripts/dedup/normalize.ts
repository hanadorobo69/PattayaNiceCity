// ─── Normalization utilities ────────────────────────────────────────────
import slugify from "slugify";

const STRIP_WORDS = [
  "pattaya", "thailand", "bar", "club", "massage", "spa", "gogo",
  "go go", "go-go", "hotel", "ktv", "karaoke", "gentlemen", "gentlemans",
  "gentleman's", "coffee", "shop", "café", "cafe", "lounge", "pub",
  "restaurant", "beer", "cocktail", "nightclub", "disco", "entertainment",
  "walking street", "soi buakhao", "beach road", "second road",
  "the", "and", "&", "at", "in", "on",
];

/** Normalize a venue name for comparison */
export function normalizeName(name: string): string {
  let n = name.toLowerCase().trim();
  // Remove accents
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Remove common suffixes / words
  for (const w of STRIP_WORDS) {
    n = n.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), " ");
  }
  // Collapse whitespace, trim
  n = n.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return n;
}

/** Normalize a phone number */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  // Strip everything except digits
  let p = phone.replace(/[^\d]/g, "");
  // Remove country code +66 or 66
  if (p.startsWith("66") && p.length > 9) p = p.slice(2);
  // Remove leading 0
  if (p.startsWith("0")) p = p.slice(1);
  return p.length >= 8 ? p : null;
}

/** Normalize a website to bare domain */
export function normalizeWebsite(url: string | null): string | null {
  if (!url) return null;
  try {
    let u = url.trim().toLowerCase();
    if (!u.startsWith("http")) u = "https://" + u;
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Generate a slug from a name */
export function makeSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, locale: "en" });
}

/** Extract social handle from URL or text */
export function normalizeSocial(val: string | null): string | null {
  if (!val) return null;
  // If it's a URL, extract last path segment
  const match = val.match(/(?:facebook\.com|instagram\.com|fb\.com)\/([^/?#]+)/i);
  if (match) return match[1].toLowerCase().replace(/^@/, "");
  // Otherwise treat as handle
  return val.toLowerCase().replace(/^@/, "").trim() || null;
}
