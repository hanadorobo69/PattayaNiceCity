"use client"

import { useState, useTransition, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { formatRelativeDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { voteComment } from "@/actions/comment-votes"
import { MentionText } from "@/components/ui/mention-text"
import { MediaGrid } from "@/components/ui/media-grid"
import { CommentForm } from "./comment-form"
import { AdminBadge } from "@/components/ui/admin-badge"
import { AvatarLightbox } from "@/components/ui/avatar-lightbox"
import { AdminInlineDelete } from "@/components/ui/admin-inline-delete"
import { adminDeleteComment } from "@/actions/comments"
import { ReportButton } from "@/components/ui/report-button"
import { ChevronUp, ChevronDown, MessageSquare, Minus } from "lucide-react"
import type { CommentWithAuthor } from "@/types"

interface CommentItemProps {
  comment: CommentWithAuthor
  postSlug: string
  currentUserId?: string | null
  isReply?: boolean
  depth?: number
  isAdmin?: boolean
}

const MAX_VISIBLE_DEPTH = 6

export function CommentItem({ comment, postSlug, currentUserId, isReply = false, depth = 0, isAdmin }: CommentItemProps) {
  const t = useTranslations("comments")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [score, setScore] = useState(comment.score ?? 0)
  const [userVote, setUserVote] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(depth < 3)
  const replyFormRef = useRef<HTMLDivElement>(null)

  const authorName = comment.author.displayName || comment.author.username
  const initials = authorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const replyCount = comment.replies?.length ?? 0

  function handleVote(value: 1 | -1) {
    if (!currentUserId) return
    startTransition(async () => {
      const result = await voteComment(comment.id, value, postSlug)
      if (result.success) {
        setScore(result.data.score)
        setUserVote(result.data.userVote)
      }
    })
  }

  if (collapsed) {
    return (
      <div className={isReply ? "ml-4 sm:ml-6" : ""}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="h-4 w-4 rounded flex items-center justify-center bg-muted group-hover:bg-[rgba(75,35,120,0.32)]">
            <ChevronDown className="h-3 w-3" />
          </div>
          <span className="font-medium">{authorName}</span>
          <span className="text-[rgba(183,148,212,0.50)]">{score} {score !== 1 ? tc("points") : tc("point")}</span>
          {replyCount > 0 && <span className="text-[rgba(183,148,212,0.50)]">· {replyCount} {replyCount !== 1 ? tc("replies") : tc("replyNoun")}</span>}
        </button>
      </div>
    )
  }

  return (
    <div id={`comment-${comment.id}`} className={isReply ? "ml-4 sm:ml-6" : ""}>
      <div className="flex gap-2 sm:gap-3">
        {/* Collapse line */}
        <div className="flex flex-col items-center shrink-0">
          {/* Vote buttons */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-5 w-5 rounded ${userVote === 1 ? "text-primary" : "text-[rgba(183,148,212,0.50)] hover:text-muted-foreground"}`}
            onClick={() => handleVote(1)}
            disabled={isPending || !currentUserId}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <span className={`text-[10px] font-bold leading-none my-0.5 ${score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-[rgba(183,148,212,0.50)]"}`}>
            {score}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={`h-5 w-5 rounded ${userVote === -1 ? "text-destructive" : "text-[rgba(183,148,212,0.50)] hover:text-muted-foreground"}`}
            onClick={() => handleVote(-1)}
            disabled={isPending || !currentUserId}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          {/* Collapse thread line */}
          {replyCount > 0 && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex-1 w-px bg-[rgba(232,168,64,0.10)] hover:bg-[rgba(232,168,64,0.50)] transition-colors mt-1 min-h-[20px] cursor-pointer group relative"
              title={t("collapseThread")}
            >
              <span className="absolute -left-1.5 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Minus className="h-3 w-3 text-primary" />
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center gap-1.5 text-xs">
            <AvatarLightbox src={comment.author.avatarUrl} alt={authorName}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={comment.author.avatarUrl || undefined} alt={authorName} />
                <AvatarFallback className="text-[8px] bg-muted font-medium">{initials}</AvatarFallback>
              </Avatar>
            </AvatarLightbox>
            <Link href={`/profile/${comment.author.username}`} className="font-semibold hover:text-primary transition-colors inline-flex items-center gap-1">
              {comment.author.isAdmin ? (
                <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">{authorName}</span>
              ) : authorName}
              {comment.author.isAdmin && <AdminBadge />}
            </Link>
            <span className="text-[rgba(183,148,212,0.50)]">·</span>
            <span className="text-[rgba(183,148,212,0.50)]">{formatRelativeDate(new Date(comment.createdAt), locale)}</span>
            {isAdmin && (
              <AdminInlineDelete
                onDelete={async () => {
                  const result = await adminDeleteComment(comment.id)
                  return { success: result.success, error: result.success ? undefined : result.error }
                }}
                itemLabel="this comment"
              />
            )}
          </div>

          {/* Body */}
          <div className="text-sm leading-relaxed">
            {comment.content
              .replace(/(\n\s*){6,}/g, "\n\n\n\n\n")
              .split("\n")
              .map((line: string, i: number) =>
                line.trim() === "" ? (
                  <br key={i} />
                ) : (
                  <span key={i} className="block">
                    <MentionText content={line} hashtagContext="community" />
                  </span>
                )
              )}
          </div>

          {/* Media */}
          {comment.media && comment.media.length > 0 && (
            <div className="mt-1">
              <MediaGrid items={comment.media} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-0.5">
            {currentUserId && (
              <>
                <button
                  onClick={() => {
                    const willShow = !showReplyForm
                    setShowReplyForm(willShow)
                    if (willShow) {
                      setTimeout(() => replyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100)
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  <MessageSquare className="h-3 w-3" />
                  {tc("reply")}
                </button>
                <ReportButton contentType="comment" contentId={comment.id} />
              </>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-2" ref={replyFormRef}>
              <CommentForm
                postId={comment.postId}
                parentId={comment.id}
                onSuccess={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-[11px] text-[#3db8a0] hover:text-[#e8a840] transition-colors font-medium mb-2"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showReplies ? "rotate-180" : ""}`} />
                {showReplies ? t("hide") : t("show")} {comment.replies.length} {comment.replies.length > 1 ? tc("replies") : tc("replyNoun")}
              </button>
              {showReplies && (
                <div className="space-y-2">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postSlug={postSlug}
                      currentUserId={currentUserId}
                      isReply
                      depth={depth + 1}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
