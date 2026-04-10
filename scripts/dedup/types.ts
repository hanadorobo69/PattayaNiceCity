// ─── Types for the dedup pipeline ───────────────────────────────────────

export const CATEGORIES = [
  "club", "gogo-bar", "bj-bar", "ktv", "gentlemans-club", "bar",
  "coffee-shop", "short-time-hotel", "ladyboy-bar", "ladyboy-gogo",
  "ladyboy-club", "massage", "ladyboy-massage", "gay-bar", "gay-gogo",
  "gay-club", "gay-massage", "russian-gogo",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ExistingVenue {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  district: string | null;
  phone: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  lat: number | null;
  lng: number | null;
  categorySlug: Category;
}

export interface SpotCandidate {
  name: string;
  slug: string;
  category: Category;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  addedAt: string;
}

export type Classification = "duplicate" | "needs_review" | "ok_to_add";

export interface MatchSignal {
  field: string;
  score: number;
  detail: string;
}

export interface DedupResult {
  candidate: SpotCandidate;
  classification: Classification;
  score: number;
  bestMatch: ExistingVenue | null;
  signals: MatchSignal[];
  reason: string;
}

export interface CategoryReport {
  category: Category;
  existingCount: number;
  candidatesFound: number;
  duplicates: number;
  needsReview: number;
  approved: number;
  approvedNames: string[];
}

export interface FinalReport {
  generatedAt: string;
  dryRun: boolean;
  summary: {
    totalExisting: number;
    totalCandidates: number;
    totalApproved: number;
    totalDuplicates: number;
    totalNeedsReview: number;
  };
  byCategory: CategoryReport[];
  spots: SpotCandidate[];
}
