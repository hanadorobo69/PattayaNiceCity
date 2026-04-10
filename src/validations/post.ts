import { z } from "zod";

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters")
    .trim(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content cannot exceed 10,000 characters")
    .trim(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().min(1, "Post ID is required"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
