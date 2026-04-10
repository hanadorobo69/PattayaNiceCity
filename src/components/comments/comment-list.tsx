import { getTranslations } from "next-intl/server"
import { CommentItem } from "./comment-item"
import type { CommentWithAuthor } from "@/types"

interface CommentListProps {
  comments: CommentWithAuthor[]
  postSlug: string
  currentUserId?: string | null
  isAdmin?: boolean
}

export async function CommentList({ comments, postSlug, currentUserId, isAdmin }: CommentListProps) {
  const t = await getTranslations("comments")

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">{t("noComments")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postSlug={postSlug} currentUserId={currentUserId} isAdmin={isAdmin} />
      ))}
    </div>
  )
}
