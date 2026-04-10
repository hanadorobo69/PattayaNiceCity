import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getCategories } from "@/actions/posts";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/posts/post-form";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "New Post",
  description: "Share your experience with the Pattaya community",
};

interface CreatePostPageProps {
  searchParams: Promise<{ venue?: string }>;
}

export default async function CreatePostPage({ searchParams }: CreatePostPageProps) {
  const params = await searchParams;
  const [userResult, categoriesResult] = await Promise.all([
    getCurrentUser(),
    getCategories(),
  ]);

  if (!userResult.success || !userResult.data) {
    redirect("/login");
  }

  const allCategories = categoriesResult.success ? categoriesResult.data : [];
  const isAdmin = !!(userResult.data as any)?.profile?.isAdmin;
  // Hide misc community categories + admin-only for non-admins
  const HIDDEN_SLUGS = new Set(["events", "location-bike-car", "administration"]);
  const visibleCategories = allCategories.filter(c => !HIDDEN_SLUGS.has(c.slug) && (isAdmin || !(c as any).isAdminOnly));
  // Put General first, then alphabetical by sortOrder
  const generalCat = visibleCategories.find(c => c.slug === "general");
  const otherCats = visibleCategories.filter(c => c.slug !== "general");
  const orderedCategories = generalCat ? [generalCat, ...otherCats] : visibleCategories;

  // If coming from a venue "Write a Review", pre-select category and pre-fill @mention
  let defaultCategoryIds: string[] = [];
  let defaultContent = "";
  if (params.venue) {
    const venue = await prisma.venue.findUnique({
      where: { id: params.venue },
      select: { categoryId: true, slug: true },
    });
    if (venue) {
      defaultCategoryIds = [venue.categoryId];
      defaultContent = `@${venue.slug} `;
    }
  }
  // No default category when not coming from a venue

  const t = await getTranslations("posts");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{t("newPost")}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("shareExperience")}
        </p>
      </div>

      <PostForm categories={orderedCategories} defaultCategoryIds={defaultCategoryIds} defaultContent={defaultContent} />
    </div>
  );
}
