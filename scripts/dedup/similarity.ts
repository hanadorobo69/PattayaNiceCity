// ─── String similarity & geo distance ───────────────────────────────────
import type { ExistingVenue, SpotCandidate, MatchSignal, Classification, DedupResult } from "./types";
import { normalizeName, normalizePhone, normalizeWebsite, normalizeSocial } from "./normalize";

/** Jaro-Winkler similarity (0-1) */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  // Winkler bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** Haversine distance in meters */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Scoring weights ────────────────────────────────────────────────────
const WEIGHTS = {
  exactName:    1.0,   // normalized name exact match
  fuzzyName:    0.7,   // Jaro-Winkler >= 0.88
  nameContains: 0.5,   // one name contains the other
  slugMatch:    0.8,   // slug exact match
  phone:        0.6,   // phone exact match
  website:      0.5,   // website domain match
  social:       0.4,   // facebook/instagram match
  geoExact:     0.5,   // within 50m
  geoNear:      0.25,  // within 200m
  address:      0.3,   // address fuzzy match
};

// ─── Thresholds ─────────────────────────────────────────────────────────
const THRESHOLD_DUPLICATE = 0.85;
const THRESHOLD_REVIEW = 0.60;

/** Score a candidate against ALL existing venues, return best match result */
export function scoreCandidate(candidate: SpotCandidate, existingVenues: ExistingVenue[]): DedupResult {
  const candNorm = normalizeName(candidate.name);
  const candPhone = normalizePhone(candidate.phone);
  const candWeb = normalizeWebsite(candidate.website);
  const candFb = normalizeSocial(candidate.facebook);
  const candIg = normalizeSocial(candidate.instagram);
  const candSlug = candidate.slug;

  let bestScore = 0;
  let bestMatch: ExistingVenue | null = null;
  let bestSignals: MatchSignal[] = [];

  for (const existing of existingVenues) {
    const signals: MatchSignal[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    const exNorm = normalizeName(existing.name);
    const exPhone = normalizePhone(existing.phone);
    const exWeb = normalizeWebsite(existing.website);
    const exFb = normalizeSocial(existing.facebook);
    const exIg = normalizeSocial(existing.instagram);

    // 1. Exact name match
    if (candNorm === exNorm && candNorm.length > 0) {
      signals.push({ field: "exactName", score: 1.0, detail: `"${candNorm}" === "${exNorm}"` });
      totalWeight += WEIGHTS.exactName;
      weightedScore += WEIGHTS.exactName;
    } else {
      // 2. Fuzzy name
      const jw = jaroWinkler(candNorm, exNorm);
      if (jw >= 0.88) {
        signals.push({ field: "fuzzyName", score: jw, detail: `JW("${candNorm}", "${exNorm}") = ${jw.toFixed(3)}` });
        totalWeight += WEIGHTS.fuzzyName;
        weightedScore += WEIGHTS.fuzzyName * jw;
      }

      // 3. Name contains
      if (candNorm.length >= 3 && exNorm.length >= 3) {
        if (candNorm.includes(exNorm) || exNorm.includes(candNorm)) {
          signals.push({ field: "nameContains", score: 1.0, detail: `"${candNorm}" ⊃ "${exNorm}"` });
          totalWeight += WEIGHTS.nameContains;
          weightedScore += WEIGHTS.nameContains;
        }
      }
    }

    // 4. Slug match
    if (candSlug === existing.slug) {
      signals.push({ field: "slugMatch", score: 1.0, detail: `slug "${candSlug}"` });
      totalWeight += WEIGHTS.slugMatch;
      weightedScore += WEIGHTS.slugMatch;
    }

    // 5. Phone match
    if (candPhone && exPhone && candPhone === exPhone) {
      signals.push({ field: "phone", score: 1.0, detail: `phone "${candPhone}"` });
      totalWeight += WEIGHTS.phone;
      weightedScore += WEIGHTS.phone;
    }

    // 6. Website match
    if (candWeb && exWeb && candWeb === exWeb) {
      signals.push({ field: "website", score: 1.0, detail: `domain "${candWeb}"` });
      totalWeight += WEIGHTS.website;
      weightedScore += WEIGHTS.website;
    }

    // 7. Social match
    if ((candFb && exFb && candFb === exFb) || (candIg && exIg && candIg === exIg)) {
      const matched = candFb === exFb ? `fb:${candFb}` : `ig:${candIg}`;
      signals.push({ field: "social", score: 1.0, detail: matched });
      totalWeight += WEIGHTS.social;
      weightedScore += WEIGHTS.social;
    }

    // 8. Geo proximity
    if (candidate.lat && candidate.lng && existing.lat && existing.lng) {
      const dist = haversineMeters(candidate.lat, candidate.lng, existing.lat, existing.lng);
      if (dist <= 50) {
        signals.push({ field: "geoExact", score: 1.0, detail: `${dist.toFixed(0)}m` });
        totalWeight += WEIGHTS.geoExact;
        weightedScore += WEIGHTS.geoExact;
      } else if (dist <= 200) {
        signals.push({ field: "geoNear", score: 1.0, detail: `${dist.toFixed(0)}m` });
        totalWeight += WEIGHTS.geoNear;
        weightedScore += WEIGHTS.geoNear;
      }
    }

    // 9. Address fuzzy
    if (candidate.address && existing.address) {
      const addrJw = jaroWinkler(
        candidate.address.toLowerCase().replace(/[^a-z0-9\s]/g, ""),
        existing.address.toLowerCase().replace(/[^a-z0-9\s]/g, "")
      );
      if (addrJw >= 0.85) {
        signals.push({ field: "address", score: addrJw, detail: `addr JW = ${addrJw.toFixed(3)}` });
        totalWeight += WEIGHTS.address;
        weightedScore += WEIGHTS.address * addrJw;
      }
    }

    // Score = primary (name-based, 0-0.85) + secondary boosts (0-0.15)
    // Name match is the mandatory anchor — without it, max score is 0.15
    let primary = 0;
    let secondary = 0;

    for (const s of signals) {
      switch (s.field) {
        case "exactName":  primary = Math.max(primary, 0.85); break;
        case "slugMatch":  primary = Math.max(primary, 0.80); break;
        case "fuzzyName":  primary = Math.max(primary, s.score * 0.80); break;
        case "nameContains": primary = Math.max(primary, 0.60); break;
        case "phone":      secondary += 0.15; break;
        case "website":    secondary += 0.10; break;
        case "social":     secondary += 0.10; break;
        case "geoExact":   secondary += 0.10; break;
        case "geoNear":    secondary += 0.05; break;
        case "address":    secondary += 0.05; break;
      }
    }

    const finalScore = primary + Math.min(secondary, 0.15);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = existing;
      bestSignals = signals;
    }
  }

  // Classify
  let classification: Classification;
  let reason: string;

  if (bestScore >= THRESHOLD_DUPLICATE) {
    classification = "duplicate";
    reason = `High confidence duplicate of "${bestMatch?.name}" (score ${bestScore.toFixed(3)})`;
  } else if (bestScore >= THRESHOLD_REVIEW) {
    classification = "needs_review";
    reason = `Possible match with "${bestMatch?.name}" (score ${bestScore.toFixed(3)}) — needs human review`;
  } else {
    classification = "ok_to_add";
    reason = bestScore > 0
      ? `Best match "${bestMatch?.name}" (score ${bestScore.toFixed(3)}) — below threshold, safe to add`
      : "No significant match found — safe to add";
  }

  return { candidate, classification, score: bestScore, bestMatch, signals: bestSignals, reason };
}
