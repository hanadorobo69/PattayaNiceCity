import { Link } from "@/i18n/navigation";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { KarmaBadge } from "@/components/ui/karma-badge";
import { VoteButtons } from "@/components/posts/vote-buttons";
import { ClickTrap } from "@/components/posts/click-trap";
import { MentionText } from "@/components/ui/mention-text";
import { AvatarLightbox } from "@/components/ui/avatar-lightbox";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PostDeleteButton } from "./post-delete-button";
import { MessageSquare } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import type { PostWithDetails, VoteValue } from "@/types";

interface PostCardProps {
  post: PostWithDetails;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
}

export async function PostCard({ post, isAuthenticated = false, isAdmin = false }: PostCardProps) {
  const t = await getTranslations("common");
  const tc = await getTranslations("categoryNames");
  const locale = await getLocale();
  const authorName = post.author.displayName || post.author.username;
  const initials = authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const initialVote = (post.votes?.[0]?.value ?? null) as VoteValue | null;

  return (
    <article className="venue-card group relative glass-card rounded-xl p-4 sm:p-5">
      {/* Full-card link (sits behind everything) */}
      <Link
        href={`/post/${post.slug}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={post.title}
      />

      <div className="flex gap-3 sm:gap-4">
        {/* Vote buttons - above the link layer */}
        <ClickTrap className="relative z-10">
          <VoteButtons
            postId={post.id}
            initialScore={post.score}
            initialVote={initialVote}
            isAuthenticated={isAuthenticated}
            vertical
          />
        </ClickTrap>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap relative z-10">
            {(post.postCategories && post.postCategories.length > 0
              ? post.postCategories.map(pc => pc.category)
              : [post.category]
            ).map(cat => (
              <Link key={cat.id} href={`/community?category=${cat.slug}`} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md hover:brightness-125 transition-all relative z-10" style={{ backgroundColor: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30` }}>
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {tc.has(cat.slug) ? tc(cat.slug) : cat.name}
              </Link>
            ))}
            <span className="text-xs text-[rgba(183,148,212,0.60)] flex items-center gap-1 flex-wrap">
              {t("by")}{" "}
              <Link href={`/profile/${post.author.username}`} className={`relative z-10 font-medium transition-colors inline-flex items-center gap-1 ${post.author.isAdmin ? "" : "text-[#e8a840]/80 hover:text-[#e8a840]"}`}>
                {post.author.isAdmin ? (
                  <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{authorName}</span>
                ) : authorName}
              </Link>
              <KarmaBadge karma={post.author.karma ?? 0} isAdmin={post.author.isAdmin} />
              <span className="text-[rgba(183,148,212,0.40)]">{" · "}{formatRelativeDate(post.createdAt, locale)}</span>
              {isAdmin && (
                <ClickTrap className="relative z-10">
                  <PostDeleteButton postId={post.id} />
                </ClickTrap>
              )}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-[#e8a840] transition-colors line-clamp-2">
            <TranslatableText
              entityType="post"
              entityId={post.id}
              field="title"
              originalText={post.title}
              sourceLanguage={post.sourceLanguage || "en"}
            />
          </h2>

          {/* Excerpt */}
          <div className="text-sm text-[rgba(240,230,255,0.55)] post-text leading-relaxed line-clamp-2">
            <MentionText content={truncate(post.content.replace(/\[gif\]\([^)]+\)/g, "[gif]"), 150)} hashtagContext="community" />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 pt-0.5">
            <span className="flex items-center gap-1.5 text-xs text-[rgba(183,148,212,0.50)] group-hover:text-[#3db8a0] transition-colors">
              <MessageSquare className="h-3.5 w-3.5" />
              {post._count.comments}
              <span className="hidden sm:inline">{t("comments")}</span>
            </span>
          </div>
        </div>

        {/* Avatar */}
        <div className="shrink-0 hidden sm:block relative z-10">
          <AvatarLightbox src={post.author.avatarUrl} alt={authorName}>
            <Avatar className="h-8 w-8 ring-1 ring-[rgba(232,168,64,0.20)]">
              <AvatarImage src={post.author.avatarUrl ?? undefined} alt={authorName} />
              <AvatarFallback className="text-xs font-medium bg-[rgba(75,35,120,0.40)] text-[#e8a840]">{initials}</AvatarFallback>
            </Avatar>
          </AvatarLightbox>
        </div>
      </div>
    </article>
  );
}
