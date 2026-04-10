import { PostCard } from "./post-card";
import type { PostWithDetails } from "@/types";

interface PostFeedProps {
  posts: PostWithDetails[];
  isAuthenticated?: boolean;
  isAdmin?: boolean;
}

export function PostFeed({ posts, isAuthenticated = false, isAdmin = false }: PostFeedProps) {
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
