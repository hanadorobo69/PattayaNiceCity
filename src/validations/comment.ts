import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(2, "Comment must be at least 2 characters")
    .max(2000, "Comment cannot exceed 2,000 characters")
    .trim(),
  postId: z.string().min(1, "Post ID is required"),
  parentId: z.string().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
