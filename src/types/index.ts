import type { Profile, Post, Category, Comment, Vote, Favorite, Rating, PostMedia, CommentMedia } from "@prisma/client";

export interface RatingCriteria {
  welcome: number
  location: number
  ambiance: number
  drinks: number
  ladyDrink?: number | null
  shortTime?: number | null
  overall: number
}

export interface AvgRatings extends RatingCriteria {
  count: number
}

export type PostAuthor = Pick<Profile, "id" | "username" | "displayName" | "avatarUrl" | "karma" | "isAdmin">;

export type PostCategoryTag = {
  category: Pick<Category, "id" | "name" | "slug" | "color" | "icon">;
};

export type PostWithDetails = Post & {
  author: PostAuthor;
  category: Pick<Category, "id" | "name" | "slug" | "color" | "icon">;
  postCategories?: PostCategoryTag[];
  votes?: Vote[];
  favorites?: Favorite[];
  ratings?: Pick<Rating, "overall">[];
  media?: PostMedia[];
  _count: {
    comments: number;
    votes: number;
    favorites: number;
    ratings?: number;
  };
};

export type PostWithComments = PostWithDetails & {
  comments: CommentWithAuthor[];
};

export type CommentWithAuthor = Comment & {
  author: Profile;
  replies?: CommentWithAuthor[];
  media?: CommentMedia[];
  score: number;
};

export type ProfileWithStats = Profile & {
  _count: {
    posts: number;
    comments: number;
  };
};

export type CategoryWithCount = Category & {
  _count: {
    posts: number;
  };
};

export type SortOption = "hot" | "new" | "top";
export type VoteValue = 1 | -1;

export interface AuthUser {
  id: string;
  email: string | undefined;
  profile: Profile | null;
}

export interface FeedFilters {
  sort: SortOption;
  categorySlug?: string;
  search?: string;
}

// ActionResult supports both discriminated union usage and optional-data usage
export type ActionResult<T = undefined> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };
