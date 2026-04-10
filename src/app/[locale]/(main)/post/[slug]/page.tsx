import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/actions/posts";
import { getPostComments } from "@/actions/comments";
import { getCurrentUser } from "@/actions/auth";
import { PostDetail } from "@/components/posts/post-detail";
import { CommentList } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";
import { Separator } from "@/components/ui/separator";
import { ReportButton } from "@/components/ui/report-button";
import { PollDisplay } from "@/components/posts/poll-display";
import { getPollByPostId } from "@/actions/polls";
import { ScrollToComment } from "@/components/ui/scroll-to-comment";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPostBySlug(slug);
  if (!result.success) return { title: "Post not found" };

  return {
    title: result.data.title,
    description: result.data.content.slice(0, 160),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const [postResult, userResult] = await Promise.all([
    getPostBySlug(slug),
    getCurrentUser(),
  ]);

  if (!postResult.success) {
    notFound();
  }

  const post = postResult.data;
  const currentUser = userResult.success ? userResult.data : null;
  const isAdmin = !!currentUser?.profile?.isAdmin;
  const canEdit = currentUser ? (post.author.id === currentUser.id || isAdmin) : false;

  const [commentsResult, pollData] = await Promise.all([
    getPostComments(post.id),
    getPollByPostId(post.id),
  ]);
  const comments = commentsResult.success ? commentsResult.data : [];
  const t = await getTranslations("comments");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-8">
      <Suspense><ScrollToComment /></Suspense>
      <PostDetail
        post={post}
        currentUserId={currentUser?.id}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />

      {pollData && (
        <PollDisplay
          poll={pollData}
          postSlug={post.slug}
          isAuthenticated={!!currentUser}
        />
      )}

      {currentUser && (
        <div className="flex justify-end">
          <ReportButton contentType="post" contentId={post.id} />
        </div>
      )}

      <Separator />

      <div className="space-y-6" id="comments">
        <h2 className="text-xl font-semibold">
          {t("commentCount", { count: comments.length })}
        </h2>

        {currentUser ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
            <a href="/login" className="text-primary hover:underline font-medium">
              {tc("signIn")}
            </a>{" "}
            {t("signInToLeaveComment")}
          </p>
        )}

        <CommentList
          comments={comments}
          postSlug={post.slug}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
