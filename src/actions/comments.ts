"use server";

import { revalidatePath } from "next/cache";
import { prisma, safeAuthorSelect, safeError } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { createCommentSchema } from "@/validations/comment";
import type { ActionResult, CommentWithAuthor } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
import { sendCommentNotificationEmail } from "@/lib/mail";
import { createMentionNotifications } from "@/lib/notifications";
import { cookies } from "next/headers";

export async function createComment(formData: FormData): Promise<ActionResult<CommentWithAuthor>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be logged in to comment" };

  const rl = rateLimit(`comment:${userId}`, 10, 60_000)
  if (!rl.ok) return { success: false, error: "Too many comments. Please try again in a minute." };

  const raw = {
    content: formData.get("content") as string,
    postId: formData.get("postId") as string,
    parentId: (formData.get("parentId") as string) || undefined,
  };

  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { content, postId, parentId } = parsed.data;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return { success: false, error: "Post not found" };
  }

  // Parse optional media items
  type RawMedia = { url: string; type: string; filename?: string; size?: number }
  let mediaItems: RawMedia[] = []
  const mediaRaw = formData.get("mediaItems") as string | null
  if (mediaRaw) {
    try { mediaItems = JSON.parse(mediaRaw) } catch {}
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content, postId, authorId: userId, parentId: parentId || null,
        sourceLanguage: (await cookies()).get("NEXT_LOCALE")?.value || "en",
        ...(mediaItems.length > 0 && {
          media: {
            create: mediaItems.map((m) => ({
              url: m.url,
              type: m.type,
              filename: m.filename ?? null,
              size: m.size ?? null,
            })),
          },
        }),
      },
      include: { author: { select: safeAuthorSelect }, media: true },
    });
    // Award karma for commenting
    await prisma.profile.update({ where: { id: userId }, data: { karma: { increment: 2 } } });

    // Notify admin if a non-admin comments on an admin's post
    const commenter = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true, displayName: true, username: true } });
    if (!commenter?.isAdmin) {
      const postAuthor = await prisma.profile.findUnique({ where: { id: post.authorId }, select: { isAdmin: true, email: true } });
      if (postAuthor?.isAdmin && postAuthor.email) {
        sendCommentNotificationEmail({
          adminEmail: postAuthor.email,
          postTitle: post.title,
          postSlug: post.slug,
          commenterName: commenter?.displayName || commenter?.username || "Someone",
          commentContent: content,
        });
      }
    }

    // Create notifications for !mentioned users
    await createMentionNotifications({ content, actorId: userId, postId: post.id, commentId: comment.id, type: "mention_comment" }).catch(() => {});
    revalidatePath(`/post/${post.slug}`);
    return { success: true, data: comment };
  } catch (error: any) {
    return { success: false, error: safeError("Failed to create comment", error) };
  }
}

export async function getPostComments(postId: string): Promise<ActionResult<CommentWithAuthor[]>> {
  try {
    // Fetch ALL comments for the post, then build the tree in JS
    const allComments = await prisma.comment.findMany({
      where: { postId, deletedAt: null },
      include: { author: { select: safeAuthorSelect }, media: true },
      orderBy: { createdAt: "asc" },
    });

    // Build tree: group replies under their parent
    const commentMap = new Map<string, any>();
    for (const c of allComments) {
      commentMap.set(c.id, { ...c, replies: [] });
    }
    const comments: any[] = [];
    for (const c of commentMap.values()) {
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId)!.replies.push(c);
      } else if (!c.parentId) {
        comments.push(c);
      }
    }
    return { success: true, data: comments as CommentWithAuthor[] };
  } catch (error) {
    return { success: false, error: safeError("Failed to load comments", error) };
  }
}

export async function adminDeleteComment(commentId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated" };
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!profile?.isAdmin) return { success: false, error: "Not authorized" };

  try {
    await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    revalidatePath("/");
    revalidatePath("/community");
    revalidatePath("/admin/posts");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: safeError("Failed to delete comment", error) };
  }
}
