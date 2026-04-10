"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flame, Clock, TrendingUp } from "lucide-react";
import type { SortOption } from "@/types";
import { cn } from "@/lib/utils";

interface FeedTabsProps {
  currentSort: SortOption;
  currentCategory?: string;
  basePath?: string;
  wide?: boolean;
}

export function FeedTabs({ currentSort, currentCategory, basePath = "/community", wide }: FeedTabsProps) {
  const searchParams = useSearchParams();
  const t = useTranslations("feed");

  const tabs: { value: SortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "hot", label: t("hot"), icon: Flame },
    { value: "new", label: t("new"), icon: Clock },
    { value: "top", label: t("top"), icon: TrendingUp },
  ];

  function buildUrl(sort: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className={cn("flex items-center gap-1 glass-card rounded-xl p-1", wide ? "w-full" : "w-fit")}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentSort === tab.value;
        return (
          <Link
            key={tab.value}
            href={buildUrl(tab.value)}
            className={cn(
              "category-pill flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium cursor-pointer",
              wide ? "flex-1 px-4 py-2" : "px-3 py-1.5",
              isActive
                ? "bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_16px_rgba(232,168,64,0.4)]"
                : "text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.08)]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
