import { Link } from "@/i18n/navigation";
import { formatRelativeDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VoteButtons } from "./vote-buttons";
import { FavoriteButton } from "./favorite-button";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AvatarLightbox } from "@/components/ui/avatar-lightbox";
import { MentionText } from "@/components/ui/mention-text";
import { MediaGrid } from "@/components/ui/media-grid";
import { TranslatableText } from "@/components/ui/translatable-text";
import { getTranslations, getLocale } from "next-intl/server";
import { Pencil } from "lucide-react";
import type { PostWithDetails } from "@/types";
import { PostDeleteButton } from "./post-delete-button";

interface PostDetailProps {
  post: PostWithDetails;
  currentUserId?: string;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export async function PostDetail({ post, currentUserId, canEdit, isAdmin }: PostDetailProps) {
  const t = await getTranslations("common");
  const tc = await getTranslations("categoryNames");
  const locale = await getLocale();
  const authorName = post.author.displayName || post.author.username;
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const userVote = currentUserId
    ? (post.votes?.find((v) => v.userId === currentUserId)?.value as 1 | -1 | undefined) ?? null
    : null;

  const isFavorited = currentUserId
    ? !!post.favorites?.find((f) => f.userId === currentUserId)
    : false;

  return (
    <article className="space-y-5">
      {/* Category row */}
      <div className="flex items-center gap-2 text-sm">
        {(post.postCategories && post.postCategories.length > 0
          ? post.postCategories.map(pc => pc.category)
          : [post.category]
        ).map(cat => (
          <Link
            key={cat.id}
            href={`/community?category=${cat.slug}`}
            className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md hover:brightness-125 transition-all"
            style={{
              backgroundColor: `${cat.color}18`,
              color: cat.color,
              border: `1px solid ${cat.color}30`,
            }}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {tc.has(cat.slug) ? tc(cat.slug) : cat.name}
          </Link>
        ))}
      </div>

      {/* Title */}
      <div className="flex items-start gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent flex-1">
          <TranslatableText
            entityType="post"
            entityId={post.id}
            field="title"
            originalText={post.title}
            sourceLanguage={post.sourceLanguage || "en"}
          />
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          {canEdit && (
            <Link
              href={`/post/${post.slug}/edit`}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[rgba(232,168,64,0.12)] text-[#e8a840] border border-[rgba(232,168,64,0.30)] hover:bg-[rgba(232,168,64,0.25)] transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          )}
          {isAdmin && <PostDeleteButton postId={post.id} />}
        </div>
      </div>

      {/* Author Info + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <AvatarLightbox src={post.author.avatarUrl} alt={authorName}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author.avatarUrl || undefined} alt={authorName} />
              <AvatarFallback className="text-xs bg-muted font-medium">{initials}</AvatarFallback>
            </Avatar>
          </AvatarLightbox>
          <div className="text-sm">
            <Link
              href={`/profile/${post.author.username}`}
              className={`font-medium hover:text-primary transition-colors inline-flex items-center gap-1`}
            >
              {post.author.isAdmin ? (
                <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{authorName}</span>
              ) : authorName}
              {post.author.isAdmin && <AdminBadge />}
            </Link>
            <span className="text-muted-foreground"> · {formatRelativeDate(post.createdAt, locale)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VoteButtons
            postId={post.id}
            initialScore={post.score}
            initialVote={userVote}
            isAuthenticated={!!currentUserId}
          />
          <FavoriteButton
            postId={post.id}
            initialFavorited={isFavorited}
            isAuthenticated={!!currentUserId}
          />
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="space-y-4">
        <TranslatableText
          entityType="post"
          entityId={post.id}
          field="content"
          originalText={post.content}
          sourceLanguage={post.sourceLanguage || "en"}
          as="div"
        >
          {post.content
          .replace(/(\n\s*){6,}/g, "\n\n\n\n\n") // max 5 consecutive line breaks
          .split("\n")
          .map((line, i) =>
            line.trim() === "" ? (
              <br key={i} />
            ) : (
              <p key={i} className="text-base leading-relaxed text-[rgba(240,230,255,0.90)] post-text">
                <MentionText content={line} hashtagContext="community" />
              </p>
            )
          )}
        </TranslatableText>
      </div>

      {/* Media attachments */}
      {post.media && post.media.length > 0 && (
        <MediaGrid items={post.media} />
      )}

    </article>
  );
}
