import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { fr, es, zhCN, zhHK, ja, ko, de, th, enUS } from "date-fns/locale";
import slugify from "slugify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFnsLocales: Record<string, typeof fr> = {
  en: enUS, fr, es, zh: zhCN, yue: zhHK, ja, ko, de, th,
};

export function formatRelativeDate(date: Date, locale?: string): string {
  const loc = locale ? dateFnsLocales[locale] ?? enUS : fr;
  return formatDistanceToNow(date, { addSuffix: true, locale: loc });
}

export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: "fr",
    trim: true,
  });
}

export function truncate(text: string, maxLength: number): string {
  // Use Array.from to properly handle multi-byte emoji characters (surrogate pairs)
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return chars.slice(0, maxLength).join("").trimEnd() + "…";
}

export function calculateHotScore(score: number, createdAt: Date): number {
  const hoursSincePost =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return score / Math.pow(hoursSincePost + 2, 1.5);
}
