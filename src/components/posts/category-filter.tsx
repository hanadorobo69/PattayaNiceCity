"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Category } from "@prisma/client";
import { useTheme } from "@/components/theme-provider";

interface CategoryFilterProps {
  categories: (Category & { isAdminOnly?: boolean; isPostOnly?: boolean })[];
  currentCategory?: string;
  currentSort: string;
  basePath?: string;
}

// Post-only slugs for community
const POST_ONLY_SLUGS = new Set(["general", "events", "promo-deals", "qna", "lost-found", "administration"])

export function CategoryFilter({ categories, currentCategory, currentSort, basePath = "/community" }: CategoryFilterProps) {
  const t = useTranslations("categoryFilter");
  const tc = useTranslations("categoryNames");
  const { theme } = useTheme();
  const isLight = theme === "nicecity-light";

  function buildUrl(slug?: string) {
    const params = new URLSearchParams();
    params.set("sort", currentSort);
    if (slug) params.set("category", slug);
    return `${basePath}?${params.toString()}`;
  }

  // Show only post-only categories (non-admin), sorted by sortOrder
  const visibleCats = categories
    .filter(c => POST_ONLY_SLUGS.has(c.slug) && !c.isAdminOnly)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  const linkClass = (slug?: string) => {
    const active = slug ? currentCategory === slug : !currentCategory;
    const base = "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all cursor-pointer";
    if (active) return isLight
      ? `${base} bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_14px_rgba(232,168,64,0.35)]`
      : `${base} bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] text-white shadow-[0_0_18px_rgba(232,168,64,0.4)]`;
    return isLight
      ? `${base} text-[#1a1510] hover:bg-[rgba(232,168,64,0.08)] hover:text-[#e8a840]`
      : `${base} text-muted-foreground hover:bg-[rgba(232,168,64,0.07)] hover:text-[#3db8a0]`;
  };

  return (
    <div className="space-y-0.5">
      {/* All */}
      <Link href={buildUrl(undefined)} className={linkClass()}>
        {t("all")}
      </Link>

      {/* Post-only categories */}
      {visibleCats.map((cat) => (
        <Link key={cat.slug} href={buildUrl(cat.slug)} className={linkClass(cat.slug)}>
          {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
          {tc.has(cat.slug) ? tc(cat.slug) : cat.name}
        </Link>
      ))}
    </div>
  );
}
