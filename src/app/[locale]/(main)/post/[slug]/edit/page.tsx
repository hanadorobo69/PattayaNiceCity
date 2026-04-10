import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPostBySlug, getCategories } from "@/actions/posts";
import { getCurrentUser } from "@/actions/auth";
import { PostForm } from "@/components/posts/post-form";

export const metadata: Metadata = {
  title: "Edit Post",
};

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;

  const [postResult, userResult, categoriesResult] = await Promise.all([
    getPostBySlug(slug),
    getCurrentUser(),
    getCategories(),
  ]);

  if (!userResult.success || !userResult.data) redirect("/login");
  if (!postResult.success) notFound();

  const post = postResult.data;
  const user = userResult.data;

  // Only author or admin can edit
  if (post.author.id !== user.id && !user.profile?.isAdmin) notFound();

  const allCategories = categoriesResult.success ? categoriesResult.data : [];
  const HIDDEN_SLUGS = new Set(["events", "location-bike-car", "administration"]);
  const visibleCategories = allCategories.filter(c => !HIDDEN_SLUGS.has(c.slug));
  const generalCat = visibleCategories.find(c => c.slug === "general");
  const otherCats = visibleCategories.filter(c => c.slug !== "general");
  const orderedCategories = generalCat ? [generalCat, ...otherCats] : visibleCategories;

  // Get current category IDs from postCategories
  const currentCategoryIds = post.postCategories?.length
    ? post.postCategories.map((pc: any) => pc.category.id)
    : [post.category.id];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">Edit Post</span>
        </h1>
      </div>

      <PostForm
        isEditing
        initialData={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          content: post.content,
          categoryId: post.category.id,
          imageUrl: post.imageUrl || "",
        }}
        categories={orderedCategories}
        defaultCategoryIds={currentCategoryIds}
      />
    </div>
  );
}
