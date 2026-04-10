import type { Metadata } from "next";
import Script from "next/script";
import { getPosts, getCategories } from "@/actions/posts";
import { PostFeed } from "@/components/posts/post-feed";
import { FeedTabs } from "@/components/posts/feed-tabs";
import { CategoryFilter } from "@/components/posts/category-filter";
import { TopSpots } from "@/components/layout/top-spots";
import { TrendingVenues } from "@/components/layout/trending-venues";
import { Announcements } from "@/components/layout/announcements";
import { SearchInput } from "@/components/ui/search-input";
import { MobileCategoryPanel } from "@/components/spots/mobile-category-panel";

import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { SortOption } from "@/types";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const revalidate = 30 // ISR: regenerate every 30s

export const metadata: Metadata = {
  title: "Community - Pattaya Nightlife Reviews & Tips",
  description: "Join the Pattaya Nice City community. Real reviews, tips, and discussions about restaurants, beaches, activities & spots in Pattaya from real visitors and expats.",
  openGraph: {
    title: "Community - Pattaya Nightlife Reviews & Tips",
    description: "Real reviews and discussions about Pattaya from the community.",
  },
};

interface CommunityPageProps {
  searchParams: Promise<{ sort?: string; category?: string; q?: string }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams;
  const sort = (params.sort as SortOption) || "hot";
  const categorySlug = params.category;
  const searchQuery = params.q;

  const userId = await getCurrentUserId();
  const isAdmin = userId ? !!(await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }))?.isAdmin : false;
  const t = await getTranslations();
  const tc = await getTranslations("categoryNames");

  const [postsResult, categoriesResult] = await Promise.all([
    getPosts({ sort, categorySlug, userId: userId ?? undefined, search: searchQuery }),
    getCategories(),
  ]);

  const posts = postsResult.success ? postsResult.data : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    name: "Pattaya Nice City Community",
    url: `${siteUrl}/community`,
    description: "Community discussions, reviews, and tips about Pattaya from real visitors and expats.",
    isPartOf: {
      "@type": "WebSite",
      name: "Pattaya Nice City",
      url: siteUrl,
    },
  }

  return (
    <>
    <Script id="community-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_300px] gap-6">

      {/* ── Left sidebar: categories (desktop) ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(4.25rem+1rem)] max-h-[calc(100vh-5.75rem)] overflow-y-auto overscroll-contain scrollbar-hide space-y-3">
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2.5 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8a840] animate-pulse" /><span className="gradient-text">{t("community.categories")}</span>
            </p>
            <CategoryFilter categories={categories} currentCategory={categorySlug} currentSort={sort} basePath="/community" />
          </div>
        </div>
      </aside>

      {/* ── Center: feed ── */}
      <div className="space-y-3 min-w-0">

        {/* Title row: search aligned with h1 */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex items-baseline gap-3 md:block">
            <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] leading-none">
              <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("community.title")}</span>
            </h1>
            <p className="text-muted-foreground text-sm md:mt-1 whitespace-nowrap">
              {categorySlug && (() => {
                const activeCat = categories.find((c: any) => c.slug === categorySlug)
                return activeCat ? <span className="text-[#e8a840] font-semibold">{activeCat.icon} {tc.has(activeCat.slug) ? tc(activeCat.slug) : activeCat.name}</span> : null
              })()}
              {categorySlug && <span className="mx-1">·</span>}
              <span className="text-foreground font-semibold">{posts.length}</span> {t("common.posts")}
            </p>
          </div>
          <div className="hidden md:flex flex-1 items-center justify-center pt-0.5">
            <div className="w-full max-w-[400px]">
              <SearchInput
                placeholder={t("community.searchPosts")}
                paramName="q"
                defaultValue={searchQuery ?? ""}
                className="w-full"
                historyKey="pvc_search_community"
              />
            </div>
          </div>
        </div>

        {/* Mobile: sticky search bar */}
        <div className="md:hidden sticky top-[3.5rem] z-30 -mx-4 px-4 py-2">
          <SearchInput
            placeholder={t("community.searchPosts")}
            paramName="q"
            defaultValue={searchQuery ?? ""}
            historyKey="pvc_search_community"
          />
        </div>

        {/* Mobile: category panel trigger */}
        <div className="lg:hidden">
          <MobileCategoryPanel
            categories={JSON.parse(JSON.stringify(categories))}
            basePath="/community"
            grouped={true}
            showExtras={true}
          />
        </div>

        {/* Tabs (wide) + post button */}
        <div className="flex items-center gap-2">
          <FeedTabs currentSort={sort} currentCategory={categorySlug} basePath="/community" wide />
          {userId && (
            <Link
              href="/create"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[rgba(232,168,64,0.90)] transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
              {t("common.post")}
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl">
            <p className="text-muted-foreground text-base font-medium">{t("community.noPosts")}</p>
          </div>
        ) : (
          <PostFeed posts={posts} isAuthenticated={!!userId} isAdmin={isAdmin} />
        )}
      </div>

      {/* ── Right sidebar: top 3 + about ── */}
      <aside className="hidden xl:block space-y-4">
        <Announcements />
        <TrendingVenues />
        <TopSpots period="week" />
        <TopSpots period="month" />
      </aside>

    </div>
    </>
  );
}
