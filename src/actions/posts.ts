"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, safeError } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { createPostSchema, updatePostSchema } from "@/validations/post";
import { generateSlug, calculateHotScore } from "@/lib/utils";
import type { ActionResult, PostWithDetails, SortOption } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
import { createMentionNotifications } from "@/lib/notifications";
import { cookies } from "next/headers";

export async function createPost(formData: FormData): Promise<ActionResult<PostWithDetails>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in to create a post" };

  const rl = rateLimit(`post:${userId}`, 5, 5 * 60_000);
  if (!rl.ok) return { success: false, error: "Too many posts. Please wait a few minutes." };

  const raw = {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    categoryId: formData.get("categoryId") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  let categoryId = parsed.data.categoryId
  if (!categoryId) {
    const generalCat = await prisma.category.findFirst({ where: { slug: "general" } })
      ?? await prisma.category.findFirst()
    if (!generalCat) return { success: false, error: "No categories found" }
    categoryId = generalCat.id
  }
  const { title, content } = parsed.data;

  // Parse multi-media items
  type RawMedia = { url: string; type: string; filename?: string; size?: number }
  let mediaItems: RawMedia[] = []
  const mediaRaw = formData.get("mediaItems") as string | null
  if (mediaRaw) {
    try { mediaItems = JSON.parse(mediaRaw) } catch {}
  }

  // First image becomes imageUrl for OG/backwards compat
  const firstImage = mediaItems.find((m) => m.type === "IMAGE")
  const imageUrl = firstImage?.url || parsed.data.imageUrl || null

  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // Parse multi-category IDs
  let categoryIds: string[] = []
  const categoryIdsRaw = formData.get("categoryIds") as string | null
  if (categoryIdsRaw) {
    try { categoryIds = JSON.parse(categoryIdsRaw) } catch {}
  }
  // Ensure primary is in the list; limit to 5
  if (!categoryIds.includes(categoryId)) categoryIds = [categoryId, ...categoryIds]
  categoryIds = categoryIds.slice(0, 5)

  // Parse poll data
  let pollInput: { question: string; options: string[] } | null = null
  const pollRaw = formData.get("pollData") as string | null
  if (pollRaw) {
    try { pollInput = JSON.parse(pollRaw) } catch {}
  }

  try {
    const post = await prisma.post.create({
      data: {
        title, slug, content, categoryId,
        imageUrl: imageUrl || null,
        authorId: userId,
        sourceLanguage: (await cookies()).get("NEXT_LOCALE")?.value || "en",
        ...(mediaItems.length > 0 && {
          media: {
            create: mediaItems.map((m, idx) => ({
              url: m.url,
              type: m.type,
              filename: m.filename ?? null,
              size: m.size ?? null,
              order: idx,
            })),
          },
        }),
        postCategories: {
          create: categoryIds.map(cId => ({ categoryId: cId })),
        },
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
        category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
        postCategories: { include: { category: { select: { id: true, name: true, slug: true, color: true, icon: true } } } },
        ratings: { select: { overall: true } },
        media: { orderBy: { order: "asc" } },
        _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true, ratings: true } },
      },
    });
    // Create poll if provided
    if (pollInput && pollInput.question.trim() && pollInput.options.filter(o => o.trim()).length >= 2) {
      await prisma.poll.create({
        data: {
          question: pollInput.question.trim(),
          postId: post.id,
          options: {
            create: pollInput.options
              .filter(o => o.trim())
              .map((text, idx) => ({ text: text.trim(), order: idx })),
          },
        },
      })
    }
    // Award karma for posting
    await prisma.profile.update({ where: { id: userId }, data: { karma: { increment: 10 } } });
    // Create notifications for !mentioned users
    await createMentionNotifications({ content: post.content, actorId: userId, postId: post.id, type: "mention_post" }).catch(() => {});
    revalidatePath("/");
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: safeError("Failed to create post", error) };
  }
}

export async function updatePost(formData: FormData): Promise<ActionResult<PostWithDetails>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in" };

  const raw = {
    id: formData.get("id") as string,
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    categoryId: formData.get("categoryId") as string,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const parsed = updatePostSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { id, title, content, categoryId, imageUrl } = parsed.data;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { success: false, error: "Post not found" };

  // Allow author OR admin to edit
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (post.authorId !== userId && !profile?.isAdmin) return { success: false, error: "Unauthorized" };

  // Parse multi-category IDs
  let categoryIds: string[] = [];
  const categoryIdsRaw = formData.get("categoryIds") as string | null;
  if (categoryIdsRaw) {
    try { categoryIds = JSON.parse(categoryIdsRaw); } catch {}
  }

  try {
    // Update multi-categories if provided
    if (categoryIds.length > 0) {
      await prisma.postCategory.deleteMany({ where: { postId: id } });
      await prisma.postCategory.createMany({
        data: categoryIds.map(cId => ({ postId: id, categoryId: cId })),
      });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(categoryIds.length > 0 ? { categoryId: categoryIds[0] } : categoryId ? { categoryId } : {}),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
        category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
        postCategories: { include: { category: { select: { id: true, name: true, slug: true, color: true, icon: true } } } },
        ratings: { select: { overall: true } },
        _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true, ratings: true } },
      },
    });
    revalidatePath(`/post/${updated.slug}`);
    revalidatePath("/");
    revalidatePath("/community");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: safeError("Failed to update post", error) };
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in" };

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { success: false, error: "Post not found" };

  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (post.authorId !== userId && !profile?.isAdmin) return { success: false, error: "Unauthorized" };

  try {
    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    revalidatePath("/");
    revalidatePath("/community");
    revalidatePath("/admin/posts");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: safeError("Failed to delete post", error) };
  }
}

export async function getPosts(filters?: {
  sort?: SortOption;
  categorySlug?: string;
  limit?: number;
  userId?: string;
  search?: string;
}): Promise<ActionResult<PostWithDetails[]>> {
  const sort = filters?.sort || "hot";
  const categorySlug = filters?.categorySlug;
  const limit = filters?.limit || 30;
  const userId = filters?.userId;
  const search = filters?.search?.trim();

  try {
    const where: any = { deletedAt: null };
    if (categorySlug) {
      where.postCategories = { some: { category: { slug: categorySlug } } };
    }
    if (search) {
      // Expand query for letter-digit boundary variations: "soi6" -> also "soi 6"
      const withSpaces = search.replace(/([a-z])(\d)/gi, "$1 $2").replace(/(\d)([a-z])/gi, "$1 $2")
      const collapsed = search.replace(/([a-z])\s+(\d)/gi, "$1$2").replace(/(\d)\s+([a-z])/gi, "$1$2")
      const variants = [...new Set([search, withSpaces, collapsed])]
      where.OR = variants.flatMap((v) => [
        { title: { contains: v, mode: "insensitive" } },
        { content: { contains: v, mode: "insensitive" } },
      ]);
    }

    let orderBy: object;
    switch (sort) {
      case "new": orderBy = { createdAt: "desc" }; break;
      case "top": orderBy = { score: "desc" }; break;
      default: orderBy = { createdAt: "desc" };
    }

    const postInclude = {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
      category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
      postCategories: { include: { category: { select: { id: true, name: true, slug: true, color: true, icon: true } } } },
      ratings: { select: { overall: true } },
      ...(userId ? { votes: { where: { userId } } } : {}),
      _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true, ratings: true } },
    } as const;

    let posts = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy,
      take: search ? undefined : limit,
    });

    // If searching, also find posts that match via comments or category names, then merge
    if (search) {
      const searchLower = search.toLowerCase();
      const existingIds = new Set(posts.map(p => p.id));

      // Find posts matching via comment content
      const matchingCommentPostIds = await prisma.comment.findMany({
        where: { content: { contains: search, mode: "insensitive" } },
        select: { postId: true },
        distinct: ["postId"],
      });
      const commentPostIds = [...new Set(matchingCommentPostIds.map(c => c.postId))].filter(id => !existingIds.has(id));

      // Find posts matching via category name
      const matchingCategories = await prisma.category.findMany({
        where: { name: { contains: search, mode: "insensitive" } },
        select: { id: true },
      });
      let categoryPostIds: string[] = [];
      if (matchingCategories.length > 0) {
        const catIds = matchingCategories.map(c => c.id);
        const catPosts = await prisma.postCategory.findMany({
          where: { categoryId: { in: catIds } },
          select: { postId: true },
          distinct: ["postId"],
        });
        categoryPostIds = catPosts.map(p => p.postId).filter(id => !existingIds.has(id) && !commentPostIds.includes(id));
      }

      const extraIds = [...commentPostIds, ...categoryPostIds];
      if (extraIds.length > 0) {
        const extraPosts = await prisma.post.findMany({
          where: { id: { in: extraIds } },
          include: postInclude,
        });
        posts = [...posts, ...extraPosts];
      }

      // Sort by relevance: title match first, then content match, then category/comment match
      posts.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(searchLower) ? 0 : 1;
        const bTitle = b.title.toLowerCase().includes(searchLower) ? 0 : 1;
        if (aTitle !== bTitle) return aTitle - bTitle;
        const aContent = a.content.toLowerCase().includes(searchLower) ? 0 : 1;
        const bContent = b.content.toLowerCase().includes(searchLower) ? 0 : 1;
        return aContent - bContent;
      });

      posts = posts.slice(0, limit);
    }

    if (sort === "hot") {
      posts.sort((a, b) => calculateHotScore(b.score, b.createdAt) - calculateHotScore(a.score, a.createdAt));
    }

    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: safeError("Failed to load posts", error) };
  }
}

export async function getCategories(): Promise<ActionResult<import("@prisma/client").Category[]>> {
  try {
    const categories = await prisma.category.findMany();
    categories.sort((a: any, b: any) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: safeError("Failed to load categories", error) };
  }
}

export async function getPostBySlug(slug: string): Promise<ActionResult<PostWithDetails>> {
  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, karma: true, isAdmin: true } },
        category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
        postCategories: { include: { category: { select: { id: true, name: true, slug: true, color: true, icon: true } } } },
        votes: true,
        favorites: true,
        ratings: {
          include: { author: { select: { username: true, displayName: true } } },
        },
        media: { orderBy: { order: "asc" } },
        _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true, ratings: true } },
      },
    });
    if (!post) return { success: false, error: "Post not found" };
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: safeError("Failed to load post", error) };
  }
}
