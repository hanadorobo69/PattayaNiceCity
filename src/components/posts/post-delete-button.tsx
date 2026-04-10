"use client"

import { AdminInlineDelete } from "@/components/ui/admin-inline-delete"
import { deletePost } from "@/actions/posts"

export function PostDeleteButton({ postId }: { postId: string }) {
  return (
    <AdminInlineDelete
      onDelete={async () => {
        const result = await deletePost(postId)
        return { success: result.success, error: result.success ? undefined : result.error }
      }}
      itemLabel="this post"
    />
  )
}
