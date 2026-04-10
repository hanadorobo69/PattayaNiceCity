import { NextRequest, NextResponse } from "next/server";
import { prisma, safeAuthorSelect } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { createPostSchema } from "@/validations/post";
import { generateSlug, calculateHotScore } from "@/lib/utils";
import type { SortOption } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") as SortOption) || "hot";
    const categorySlug = searchParams.get("category") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where = categorySlug
      ? { category: { slug: categorySlug }, deletedAt: null }
      : { deletedAt: null };

    let orderBy: object;
    switch (sort) {
      case "new": orderBy = { createdAt: "desc" }; break;
      case "top": orderBy = { score: "desc" }; break;
      default: orderBy = { createdAt: "desc" };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: safeAuthorSelect },
        category: true,
        _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    let sortedPosts = posts;
    if (sort === "hot") {
      sortedPosts = [...posts].sort((a, b) => {
        return calculateHotScore(b.score, b.createdAt) - calculateHotScore(a.score, a.createdAt);
      });
    }

    return NextResponse.json({ posts: sortedPosts });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, content, imageUrl } = parsed.data;
    let categoryId = parsed.data.categoryId
    if (!categoryId) {
      const generalCat = await prisma.category.findFirst({ where: { slug: "general" } })
        ?? await prisma.category.findFirst()
      if (!generalCat) return NextResponse.json({ error: "No categories" }, { status: 500 })
      categoryId = generalCat.id
    }
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const post = await prisma.post.create({
      data: { title, slug, content, categoryId, imageUrl: imageUrl || null, authorId: userId },
      include: {
        author: { select: safeAuthorSelect },
        category: true,
        _count: { select: { comments: { where: { deletedAt: null } }, votes: true, favorites: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
