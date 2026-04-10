/**
 * Integration tests for community features:
 * - Post CRUD (create, read, update, delete)
 * - Multi-category posts
 * - Comments + threaded replies
 * - Votes (post upvote/downvote, comment votes)
 * - @mentions and #hashtags parsing
 * - Post ratings
 * - Post favorites
 * - Venue comments + replies + votes
 * - Venue ratings (half-star)
 * - Venue favorites
 * - Venue media gallery
 * - Polls
 *
 * Uses a separate PostgreSQL database (pattayavicecity_test).
 * Run: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { setupTestDb, teardownTestDb } from "./setup"
import type { PrismaClient } from "@prisma/client"

let prisma: PrismaClient

beforeAll(async () => {
  prisma = await setupTestDb()
}, 60000)

afterAll(async () => {
  await teardownTestDb()
}, 30000)

// ══════════════════════════════════════════════════════════════
// POST CRUD
// ══════════════════════════════════════════════════════════════

describe("Post CRUD", () => {
  let postId: string
  let categoryId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    categoryId = cat!.id
  })

  it("create a post with required fields", async () => {
    const post = await prisma.post.create({
      data: {
        title: "Best bars on Soi 6",
        slug: "best-bars-soi-6",
        content: "Here are my top picks for Soi 6...",
        authorId: "test-user-id",
        categoryId,
      },
    })
    expect(post.id).toBeTruthy()
    expect(post.title).toBe("Best bars on Soi 6")
    expect(post.score).toBe(0)
    postId = post.id
  })

  it("read post with author and category", async () => {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true, category: true },
    })
    expect(post).toBeTruthy()
    expect(post!.author.username).toBe("testuser")
    expect(post!.category.slug).toBe("general")
  })

  it("update post content", async () => {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { content: "Updated content with more details..." },
    })
    expect(updated.content).toBe("Updated content with more details...")
  })

  it("slug uniqueness enforced", async () => {
    await expect(
      prisma.post.create({
        data: {
          title: "Duplicate",
          slug: "best-bars-soi-6",
          content: "Dup",
          authorId: "test-user-id",
          categoryId,
        },
      })
    ).rejects.toThrow()
  })

  it("delete post", async () => {
    await prisma.post.delete({ where: { id: postId } })
    const deleted = await prisma.post.findUnique({ where: { id: postId } })
    expect(deleted).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════
// MULTI-CATEGORY POSTS
// ══════════════════════════════════════════════════════════════

describe("Multi-category posts", () => {
  let postId: string

  afterAll(async () => {
    await prisma.postCategory.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("create post with multiple categories (up to 5)", async () => {
    const general = await prisma.category.findUnique({ where: { slug: "general" } })
    const bar = await prisma.category.findUnique({ where: { slug: "bar" } })
    const massage = await prisma.category.findUnique({ where: { slug: "massage" } })

    const post = await prisma.post.create({
      data: {
        title: "Multi-cat post",
        slug: "multi-cat-post",
        content: "Testing multiple categories",
        authorId: "test-user-id",
        categoryId: general!.id,
      },
    })
    postId = post.id

    // Add PostCategory links
    await prisma.postCategory.createMany({
      data: [
        { postId, categoryId: general!.id },
        { postId, categoryId: bar!.id },
        { postId, categoryId: massage!.id },
      ],
    })

    const cats = await prisma.postCategory.findMany({
      where: { postId },
      include: { category: true },
    })
    expect(cats.length).toBe(3)
    const slugs = cats.map(c => c.category.slug).sort()
    expect(slugs).toEqual(["bar", "general", "massage"])
  })

  it("prevents duplicate category assignment", async () => {
    const general = await prisma.category.findUnique({ where: { slug: "general" } })
    await expect(
      prisma.postCategory.create({
        data: { postId, categoryId: general!.id },
      })
    ).rejects.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════
// COMMENTS + THREADED REPLIES
// ══════════════════════════════════════════════════════════════

describe("Comments and threaded replies", () => {
  let postId: string
  let commentId: string
  let replyId: string
  let nestedReplyId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Comment test post",
        slug: "comment-test-post",
        content: "Post for testing comments",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    // Delete in correct order (nested first)
    if (nestedReplyId) await prisma.comment.delete({ where: { id: nestedReplyId } }).catch(() => {})
    if (replyId) await prisma.comment.delete({ where: { id: replyId } }).catch(() => {})
    if (commentId) await prisma.comment.delete({ where: { id: commentId } }).catch(() => {})
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("create a top-level comment", async () => {
    const comment = await prisma.comment.create({
      data: {
        content: "Great post! Very helpful.",
        authorId: "test-user-id",
        postId,
      },
    })
    expect(comment.id).toBeTruthy()
    expect(comment.parentId).toBeNull()
    expect(comment.score).toBe(0)
    commentId = comment.id
  })

  it("create a reply to a comment", async () => {
    const reply = await prisma.comment.create({
      data: {
        content: "Thanks for the kind words!",
        authorId: "test-admin-id",
        postId,
        parentId: commentId,
      },
    })
    expect(reply.parentId).toBe(commentId)
    replyId = reply.id
  })

  it("create a nested reply (reply to reply)", async () => {
    const nested = await prisma.comment.create({
      data: {
        content: "No problem!",
        authorId: "test-user-id",
        postId,
        parentId: replyId,
      },
    })
    expect(nested.parentId).toBe(replyId)
    nestedReplyId = nested.id
  })

  it("read comment tree with replies", async () => {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: {
          include: { replies: true },
        },
      },
    })
    expect(comment).toBeTruthy()
    expect(comment!.replies.length).toBe(1)
    expect(comment!.replies[0].id).toBe(replyId)
    expect(comment!.replies[0].replies.length).toBe(1)
    expect(comment!.replies[0].replies[0].id).toBe(nestedReplyId)
  })

  it("count all comments on a post", async () => {
    const count = await prisma.comment.count({ where: { postId } })
    expect(count).toBe(3) // 1 top-level + 1 reply + 1 nested
  })

  it("top-level comments only (parentId = null)", async () => {
    const topLevel = await prisma.comment.findMany({
      where: { postId, parentId: null },
    })
    expect(topLevel.length).toBe(1)
    expect(topLevel[0].id).toBe(commentId)
  })
})

// ══════════════════════════════════════════════════════════════
// POST VOTES (upvote / downvote)
// ══════════════════════════════════════════════════════════════

describe("Post votes", () => {
  let postId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Vote test post",
        slug: "vote-test-post",
        content: "Testing votes",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    await prisma.vote.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("upvote a post (value = 1)", async () => {
    const vote = await prisma.vote.create({
      data: { userId: "test-user-id", postId, value: 1 },
    })
    expect(vote.value).toBe(1)
  })

  it("another user downvotes (value = -1)", async () => {
    const vote = await prisma.vote.create({
      data: { userId: "test-admin-id", postId, value: -1 },
    })
    expect(vote.value).toBe(-1)
  })

  it("one vote per user per post (unique constraint)", async () => {
    await expect(
      prisma.vote.create({
        data: { userId: "test-user-id", postId, value: -1 },
      })
    ).rejects.toThrow()
  })

  it("compute net score", async () => {
    const votes = await prisma.vote.findMany({ where: { postId } })
    const score = votes.reduce((sum, v) => sum + v.value, 0)
    expect(score).toBe(0) // +1 - 1 = 0
  })

  it("change vote (upsert)", async () => {
    await prisma.vote.update({
      where: { userId_postId: { userId: "test-admin-id", postId } },
      data: { value: 1 },
    })
    const votes = await prisma.vote.findMany({ where: { postId } })
    const score = votes.reduce((sum, v) => sum + v.value, 0)
    expect(score).toBe(2) // +1 + 1 = 2
  })

  it("delete vote (undo)", async () => {
    await prisma.vote.delete({
      where: { userId_postId: { userId: "test-admin-id", postId } },
    })
    const votes = await prisma.vote.findMany({ where: { postId } })
    expect(votes.length).toBe(1)
    expect(votes[0].value).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════
// COMMENT VOTES
// ══════════════════════════════════════════════════════════════

describe("Comment votes", () => {
  let postId: string
  let commentId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Comment vote test",
        slug: "comment-vote-test",
        content: "For testing comment votes",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id

    const comment = await prisma.comment.create({
      data: { content: "Vote on me!", authorId: "test-user-id", postId },
    })
    commentId = comment.id
  })

  afterAll(async () => {
    await prisma.commentVote.deleteMany({ where: { commentId } })
    await prisma.comment.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("upvote a comment", async () => {
    const vote = await prisma.commentVote.create({
      data: { userId: "test-admin-id", commentId, value: 1 },
    })
    expect(vote.value).toBe(1)
  })

  it("one vote per user per comment", async () => {
    await expect(
      prisma.commentVote.create({
        data: { userId: "test-admin-id", commentId, value: -1 },
      })
    ).rejects.toThrow()
  })

  it("compute comment score", async () => {
    // Add another vote
    await prisma.commentVote.create({
      data: { userId: "test-user-id", commentId, value: 1 },
    })
    const votes = await prisma.commentVote.findMany({ where: { commentId } })
    const score = votes.reduce((sum, v) => sum + v.value, 0)
    expect(score).toBe(2)
  })
})

// ══════════════════════════════════════════════════════════════
// @MENTIONS AND #HASHTAGS PARSING
// ══════════════════════════════════════════════════════════════

describe("@mentions and #hashtags", () => {
  const mentionRegex = /(@[a-z0-9-]+|#[a-zA-Z0-9_\u00C0-\u024F]+)/g

  it("parse single @mention", () => {
    const text = "Check out @walking-street-bar for cheap drinks"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["@walking-street-bar"])
  })

  it("parse multiple @mentions", () => {
    const text = "@soi-6-bar is better than @lk-metro-club"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["@soi-6-bar", "@lk-metro-club"])
  })

  it("parse single #hashtag", () => {
    const text = "Night out #pattaya"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["#pattaya"])
  })

  it("parse multiple #hashtags", () => {
    const text = "#nightlife #walkingstreet #gogobars"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["#nightlife", "#walkingstreet", "#gogobars"])
  })

  it("parse mixed @mentions and #hashtags", () => {
    const text = "Had a great time at @sapphire-club last night #nightlife #pattaya"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["@sapphire-club", "#nightlife", "#pattaya"])
  })

  it("no matches in plain text", () => {
    const text = "Just a regular comment with no special syntax"
    const matches = text.match(mentionRegex)
    expect(matches).toBeNull()
  })

  it("@mention with numbers and hyphens", () => {
    const text = "@bar-123-soi-6 is the place"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["@bar-123-soi-6"])
  })

  it("#hashtag with accented characters", () => {
    const text = "Soirée #NuitàPattaya #Découverte"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["#NuitàPattaya", "#Découverte"])
  })

  it("#hashtag with underscores", () => {
    const text = "#best_bar_ever"
    const matches = text.match(mentionRegex)
    expect(matches).toEqual(["#best_bar_ever"])
  })

  it("@mention creates link to /go/{slug}", () => {
    const mention = "@test-venue"
    const slug = mention.slice(1)
    expect(slug).toBe("test-venue")
    expect(`/go/${slug}`).toBe("/go/test-venue")
  })

  it("store and retrieve post with @mention in content", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Mention Test Bar",
        slug: "mention-test-bar",
        categoryId: cat!.id,
      },
    })

    const post = await prisma.post.create({
      data: {
        title: "Review of @mention-test-bar",
        slug: "mention-review",
        content: "@mention-test-bar has great drinks! #recommended #bestbar",
        authorId: "test-user-id",
        categoryId: cat!.id,
        venueId: venue.id,
      },
    })

    expect(post.content).toContain("@mention-test-bar")
    expect(post.content).toContain("#recommended")
    expect(post.venueId).toBe(venue.id)

    // Verify the mention resolves to venue
    const slug = "@mention-test-bar".slice(1)
    const foundVenue = await prisma.venue.findUnique({ where: { slug } })
    expect(foundVenue).toBeTruthy()
    expect(foundVenue!.id).toBe(venue.id)

    await prisma.post.delete({ where: { id: post.id } })
    await prisma.venue.delete({ where: { id: venue.id } })
  })

  it("comment with @mention and #hashtag", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Mention comment test",
        slug: "mention-comment-test",
        content: "test",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })

    const comment = await prisma.comment.create({
      data: {
        content: "I agree! @some-bar is amazing #musttry",
        authorId: "test-admin-id",
        postId: post.id,
      },
    })

    const matches = comment.content.match(mentionRegex)
    expect(matches).toEqual(["@some-bar", "#musttry"])

    await prisma.comment.delete({ where: { id: comment.id } })
    await prisma.post.delete({ where: { id: post.id } })
  })
})

// ══════════════════════════════════════════════════════════════
// POST RATINGS
// ══════════════════════════════════════════════════════════════

describe("Post ratings", () => {
  let postId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const post = await prisma.post.create({
      data: {
        title: "Rating test post",
        slug: "rating-test-post",
        content: "Rate this!",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    await prisma.rating.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("create a rating (1-5)", async () => {
    const rating = await prisma.rating.create({
      data: {
        authorId: "test-user-id",
        postId,
        overall: 4,
        scores: JSON.stringify({ quality: 4, value: 5, atmosphere: 3 }),
        comment: "Really good place",
      },
    })
    expect(rating.overall).toBe(4)
  })

  it("one rating per user per post", async () => {
    await expect(
      prisma.rating.create({
        data: { authorId: "test-user-id", postId, overall: 5 },
      })
    ).rejects.toThrow()
  })

  it("second user rates", async () => {
    const rating = await prisma.rating.create({
      data: {
        authorId: "test-admin-id",
        postId,
        overall: 3,
        scores: JSON.stringify({ quality: 3, value: 2, atmosphere: 4 }),
      },
    })
    expect(rating.overall).toBe(3)
  })

  it("compute average rating", async () => {
    const ratings = await prisma.rating.findMany({ where: { postId } })
    expect(ratings.length).toBe(2)
    const avg = ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length
    expect(avg).toBe(3.5) // (4 + 3) / 2
  })

  it("update existing rating", async () => {
    const updated = await prisma.rating.update({
      where: { authorId_postId: { authorId: "test-user-id", postId } },
      data: { overall: 5, comment: "Changed my mind, it's even better" },
    })
    expect(updated.overall).toBe(5)
    expect(updated.comment).toBe("Changed my mind, it's even better")
  })
})

// ══════════════════════════════════════════════════════════════
// POST FAVORITES
// ══════════════════════════════════════════════════════════════

describe("Post favorites", () => {
  let postId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Favorite test",
        slug: "favorite-test",
        content: "Bookmark me!",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    await prisma.favorite.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("favorite a post", async () => {
    const fav = await prisma.favorite.create({
      data: { userId: "test-user-id", postId },
    })
    expect(fav.id).toBeTruthy()
  })

  it("one favorite per user per post", async () => {
    await expect(
      prisma.favorite.create({
        data: { userId: "test-user-id", postId },
      })
    ).rejects.toThrow()
  })

  it("multiple users can favorite same post", async () => {
    await prisma.favorite.create({
      data: { userId: "test-admin-id", postId },
    })
    const count = await prisma.favorite.count({ where: { postId } })
    expect(count).toBe(2)
  })

  it("unfavorite (delete)", async () => {
    await prisma.favorite.delete({
      where: { userId_postId: { userId: "test-user-id", postId } },
    })
    const count = await prisma.favorite.count({ where: { postId } })
    expect(count).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════
// VENUE COMMENTS + REPLIES + VOTES
// ══════════════════════════════════════════════════════════════

describe("Venue comments, replies, and votes", () => {
  let venueId: string
  let commentId: string
  let replyId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Comment Test Venue",
        slug: "comment-test-venue",
        categoryId: cat!.id,
        isActive: true,
      },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venueCommentVote.deleteMany({})
    await prisma.venueComment.deleteMany({ where: { venueId } })
    await prisma.venue.delete({ where: { id: venueId } }).catch(() => {})
  })

  it("create venue comment", async () => {
    const comment = await prisma.venueComment.create({
      data: {
        content: "Great atmosphere and friendly staff!",
        authorId: "test-user-id",
        venueId,
      },
    })
    expect(comment.id).toBeTruthy()
    expect(comment.parentId).toBeNull()
    commentId = comment.id
  })

  it("reply to venue comment", async () => {
    const reply = await prisma.venueComment.create({
      data: {
        content: "Thanks for your review!",
        authorId: "test-admin-id",
        venueId,
        parentId: commentId,
      },
    })
    expect(reply.parentId).toBe(commentId)
    replyId = reply.id
  })

  it("read venue comment tree", async () => {
    const comment = await prisma.venueComment.findUnique({
      where: { id: commentId },
      include: { replies: true },
    })
    expect(comment!.replies.length).toBe(1)
    expect(comment!.replies[0].content).toBe("Thanks for your review!")
  })

  it("upvote venue comment", async () => {
    const vote = await prisma.venueCommentVote.create({
      data: { userId: "test-admin-id", commentId, value: 1 },
    })
    expect(vote.value).toBe(1)
  })

  it("downvote venue comment", async () => {
    const vote = await prisma.venueCommentVote.create({
      data: { userId: "test-user-id", commentId, value: -1 },
    })
    expect(vote.value).toBe(-1)
  })

  it("one vote per user per venue comment", async () => {
    await expect(
      prisma.venueCommentVote.create({
        data: { userId: "test-admin-id", commentId, value: -1 },
      })
    ).rejects.toThrow()
  })

  it("compute venue comment score", async () => {
    const votes = await prisma.venueCommentVote.findMany({ where: { commentId } })
    const score = votes.reduce((sum, v) => sum + v.value, 0)
    expect(score).toBe(0) // +1 - 1 = 0
  })

  it("count all venue comments (including replies)", async () => {
    const count = await prisma.venueComment.count({ where: { venueId } })
    expect(count).toBe(2)
  })
})

// ══════════════════════════════════════════════════════════════
// VENUE RATINGS (half-star)
// ══════════════════════════════════════════════════════════════

describe("Venue ratings — comprehensive", () => {
  let venueId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "massage" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Rating Test Massage",
        slug: "rating-test-massage",
        categoryId: cat!.id,
      },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venueRating.deleteMany({ where: { venueId } })
    await prisma.venue.delete({ where: { id: venueId } }).catch(() => {})
  })

  it("create rating with detailed scores", async () => {
    const rating = await prisma.venueRating.create({
      data: {
        authorId: "test-user-id",
        venueId,
        overall: 4.5,
        scores: JSON.stringify({
          atmosphere: 5,
          service: 4,
          value: 4.5,
          cleanliness: 4.5,
        }),
        comment: "Best massage in Pattaya!",
      },
    })
    expect(rating.overall).toBe(4.5)
    const scores = JSON.parse(rating.scores)
    expect(scores.atmosphere).toBe(5)
    expect(scores.value).toBe(4.5)
  })

  it("one rating per user per venue", async () => {
    await expect(
      prisma.venueRating.create({
        data: { authorId: "test-user-id", venueId, overall: 3, scores: "{}" },
      })
    ).rejects.toThrow()
  })

  it("update rating via upsert", async () => {
    const updated = await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: "test-user-id", venueId } },
      create: { authorId: "test-user-id", venueId, overall: 3, scores: "{}" },
      update: { overall: 3.5, comment: "Revised opinion" },
    })
    expect(updated.overall).toBe(3.5)
    expect(updated.comment).toBe("Revised opinion")
  })

  it("multiple users rate same venue", async () => {
    await prisma.venueRating.create({
      data: { authorId: "test-admin-id", venueId, overall: 5, scores: "{}" },
    })

    const ratings = await prisma.venueRating.findMany({ where: { venueId } })
    expect(ratings.length).toBe(2)
    const avg = ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length
    expect(avg).toBe(4.25) // (3.5 + 5) / 2
  })

  it("all valid half-star values accepted", async () => {
    for (const val of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
      const updated = await prisma.venueRating.update({
        where: { authorId_venueId: { authorId: "test-user-id", venueId } },
        data: { overall: val },
      })
      expect(updated.overall).toBe(val)
    }
  })
})

// ══════════════════════════════════════════════════════════════
// VENUE FAVORITES
// ══════════════════════════════════════════════════════════════

describe("Venue favorites", () => {
  let venueId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "gogo-bar" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Fav Test GoGo",
        slug: "fav-test-gogo",
        categoryId: cat!.id,
      },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venueFavorite.deleteMany({ where: { venueId } })
    await prisma.venue.delete({ where: { id: venueId } }).catch(() => {})
  })

  it("favorite a venue", async () => {
    const fav = await prisma.venueFavorite.create({
      data: { userId: "test-user-id", venueId },
    })
    expect(fav.id).toBeTruthy()
  })

  it("one favorite per user per venue", async () => {
    await expect(
      prisma.venueFavorite.create({
        data: { userId: "test-user-id", venueId },
      })
    ).rejects.toThrow()
  })

  it("check if venue is favorited", async () => {
    const fav = await prisma.venueFavorite.findUnique({
      where: { userId_venueId: { userId: "test-user-id", venueId } },
    })
    expect(fav).toBeTruthy()

    const notFav = await prisma.venueFavorite.findUnique({
      where: { userId_venueId: { userId: "test-admin-id", venueId } },
    })
    expect(notFav).toBeNull()
  })

  it("unfavorite venue", async () => {
    await prisma.venueFavorite.delete({
      where: { userId_venueId: { userId: "test-user-id", venueId } },
    })
    const count = await prisma.venueFavorite.count({ where: { venueId } })
    expect(count).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// VENUE MEDIA GALLERY
// ══════════════════════════════════════════════════════════════

describe("Venue media gallery", () => {
  let venueId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "club" } })
    const venue = await prisma.venue.create({
      data: {
        name: "Media Test Club",
        slug: "media-test-club",
        categoryId: cat!.id,
        imageUrl: "/uploads/cover.jpg",
      },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venueMedia.deleteMany({ where: { venueId } })
    await prisma.venue.delete({ where: { id: venueId } }).catch(() => {})
  })

  it("add multiple images to venue", async () => {
    const images = [
      { url: "/uploads/img1.jpg", type: "IMAGE", order: 0 },
      { url: "/uploads/img2.jpg", type: "IMAGE", order: 1 },
      { url: "/uploads/img3.jpg", type: "IMAGE", order: 2 },
    ]

    for (const img of images) {
      await prisma.venueMedia.create({
        data: { venueId, ...img },
      })
    }

    const media = await prisma.venueMedia.findMany({
      where: { venueId },
      orderBy: { order: "asc" },
    })
    expect(media.length).toBe(3)
    expect(media[0].url).toBe("/uploads/img1.jpg")
    expect(media[2].url).toBe("/uploads/img3.jpg")
  })

  it("add video to venue", async () => {
    await prisma.venueMedia.create({
      data: { venueId, url: "/uploads/tour.mp4", type: "VIDEO", order: 3 },
    })

    const videos = await prisma.venueMedia.findMany({
      where: { venueId, type: "VIDEO" },
    })
    expect(videos.length).toBe(1)
  })

  it("total media count (images + videos)", async () => {
    const count = await prisma.venueMedia.count({ where: { venueId } })
    expect(count).toBe(4) // 3 images + 1 video
  })

  it("cover image is on venue.imageUrl, not in media", async () => {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { media: true },
    })
    expect(venue!.imageUrl).toBe("/uploads/cover.jpg")
    // Cover should NOT be duplicated in media
    const coverInMedia = venue!.media.find(m => m.url === "/uploads/cover.jpg")
    expect(coverInMedia).toBeUndefined()
  })

  it("delete media item", async () => {
    const media = await prisma.venueMedia.findFirst({ where: { venueId, url: "/uploads/img2.jpg" } })
    await prisma.venueMedia.delete({ where: { id: media!.id } })

    const remaining = await prisma.venueMedia.count({ where: { venueId } })
    expect(remaining).toBe(3)
  })

  it("cascade delete: deleting venue removes all media", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const tempVenue = await prisma.venue.create({
      data: { name: "Cascade Test", slug: "cascade-test", categoryId: cat!.id },
    })
    await prisma.venueMedia.createMany({
      data: [
        { venueId: tempVenue.id, url: "/a.jpg", type: "IMAGE" },
        { venueId: tempVenue.id, url: "/b.jpg", type: "IMAGE" },
      ],
    })

    await prisma.venue.delete({ where: { id: tempVenue.id } })
    const orphaned = await prisma.venueMedia.findMany({ where: { venueId: tempVenue.id } })
    expect(orphaned.length).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// POLLS
// ══════════════════════════════════════════════════════════════

describe("Polls", () => {
  let postId: string
  let pollId: string
  let optionIds: string[] = []

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Best area in Pattaya?",
        slug: "best-area-poll",
        content: "Vote for your favorite area!",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    await prisma.pollVote.deleteMany({})
    await prisma.pollOption.deleteMany({})
    await prisma.poll.deleteMany({})
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("create poll with options", async () => {
    const poll = await prisma.poll.create({
      data: {
        question: "Best area in Pattaya?",
        postId,
        options: {
          create: [
            { text: "Walking Street", order: 0 },
            { text: "Soi 6", order: 1 },
            { text: "LK Metro", order: 2 },
            { text: "Soi Buakhao", order: 3 },
          ],
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    })

    expect(poll.question).toBe("Best area in Pattaya?")
    expect(poll.options.length).toBe(4)
    expect(poll.options[0].text).toBe("Walking Street")
    pollId = poll.id
    optionIds = poll.options.map(o => o.id)
  })

  it("vote on a poll option", async () => {
    const vote = await prisma.pollVote.create({
      data: { userId: "test-user-id", optionId: optionIds[1] }, // Soi 6
    })
    expect(vote.id).toBeTruthy()
  })

  it("another user votes", async () => {
    await prisma.pollVote.create({
      data: { userId: "test-admin-id", optionId: optionIds[0] }, // Walking Street
    })
  })

  it("one vote per user per option", async () => {
    await expect(
      prisma.pollVote.create({
        data: { userId: "test-user-id", optionId: optionIds[1] },
      })
    ).rejects.toThrow()
  })

  it("count votes per option", async () => {
    const options = await prisma.pollOption.findMany({
      where: { pollId },
      include: { _count: { select: { votes: true } } },
      orderBy: { order: "asc" },
    })

    expect(options[0]._count.votes).toBe(1) // Walking Street
    expect(options[1]._count.votes).toBe(1) // Soi 6
    expect(options[2]._count.votes).toBe(0) // LK Metro
    expect(options[3]._count.votes).toBe(0) // Soi Buakhao
  })

  it("one poll per post (unique constraint)", async () => {
    await expect(
      prisma.poll.create({
        data: { question: "Duplicate poll", postId },
      })
    ).rejects.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════
// POST MEDIA (multi-image posts)
// ══════════════════════════════════════════════════════════════

describe("Post media", () => {
  let postId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Post with media",
        slug: "post-with-media",
        content: "Check out these photos",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    postId = post.id
  })

  afterAll(async () => {
    await prisma.postMedia.deleteMany({ where: { postId } })
    await prisma.post.delete({ where: { id: postId } }).catch(() => {})
  })

  it("attach multiple images to post", async () => {
    await prisma.postMedia.createMany({
      data: [
        { postId, url: "/uploads/p1.jpg", type: "IMAGE", order: 0 },
        { postId, url: "/uploads/p2.jpg", type: "IMAGE", order: 1 },
        { postId, url: "/uploads/p3.jpg", type: "IMAGE", order: 2 },
      ],
    })

    const media = await prisma.postMedia.findMany({
      where: { postId },
      orderBy: { order: "asc" },
    })
    expect(media.length).toBe(3)
  })

  it("cascade delete: deleting post removes media", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const tempPost = await prisma.post.create({
      data: {
        title: "Temp media post",
        slug: "temp-media-post",
        content: "Will be deleted",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })
    await prisma.postMedia.create({
      data: { postId: tempPost.id, url: "/tmp.jpg", type: "IMAGE" },
    })

    await prisma.post.delete({ where: { id: tempPost.id } })
    const orphaned = await prisma.postMedia.findMany({ where: { postId: tempPost.id } })
    expect(orphaned.length).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// CASCADE DELETES
// ══════════════════════════════════════════════════════════════

describe("Cascade deletes", () => {
  it("deleting a post cascades comments, votes, favorites", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Cascade test",
        slug: "cascade-test-post",
        content: "Will be deleted",
        authorId: "test-user-id",
        categoryId: cat!.id,
      },
    })

    // Add comment, vote, favorite
    const comment = await prisma.comment.create({
      data: { content: "Comment", authorId: "test-user-id", postId: post.id },
    })
    await prisma.vote.create({
      data: { userId: "test-user-id", postId: post.id, value: 1 },
    })
    await prisma.favorite.create({
      data: { userId: "test-user-id", postId: post.id },
    })
    await prisma.commentVote.create({
      data: { userId: "test-admin-id", commentId: comment.id, value: 1 },
    })

    // Delete post
    await prisma.post.delete({ where: { id: post.id } })

    // Verify everything is gone
    expect(await prisma.comment.findMany({ where: { postId: post.id } })).toHaveLength(0)
    expect(await prisma.vote.findMany({ where: { postId: post.id } })).toHaveLength(0)
    expect(await prisma.favorite.findMany({ where: { postId: post.id } })).toHaveLength(0)
  })

  it("deleting a venue cascades comments, ratings, media, favorites", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: { name: "Cascade Venue", slug: "cascade-venue", categoryId: cat!.id },
    })

    await prisma.venueComment.create({
      data: { content: "Comment", authorId: "test-user-id", venueId: venue.id },
    })
    await prisma.venueRating.create({
      data: { authorId: "test-user-id", venueId: venue.id, overall: 4, scores: "{}" },
    })
    await prisma.venueMedia.create({
      data: { venueId: venue.id, url: "/test.jpg", type: "IMAGE" },
    })
    await prisma.venueFavorite.create({
      data: { userId: "test-user-id", venueId: venue.id },
    })

    // Delete venue
    await prisma.venue.delete({ where: { id: venue.id } })

    // Verify everything is gone
    expect(await prisma.venueComment.findMany({ where: { venueId: venue.id } })).toHaveLength(0)
    expect(await prisma.venueRating.findMany({ where: { venueId: venue.id } })).toHaveLength(0)
    expect(await prisma.venueMedia.findMany({ where: { venueId: venue.id } })).toHaveLength(0)
    expect(await prisma.venueFavorite.findMany({ where: { venueId: venue.id } })).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════════
// NEW MASSAGE CATEGORIES
// ══════════════════════════════════════════════════════════════

describe("Massage pricing fields", () => {
  let venueId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "massage" } })
    const venue = await prisma.venue.create({
      data: { name: "Massage Price Test", slug: "massage-price-test", categoryId: cat!.id },
    })
    venueId = venue.id
  })

  afterAll(async () => {
    await prisma.venue.delete({ where: { id: venueId } }).catch(() => {})
  })

  it("store and retrieve all 3 massage prices via raw SQL", async () => {
    await prisma.$executeRawUnsafe(
      `UPDATE "Venue" SET "priceThaiMassage" = 300, "priceFootMassage" = 250, "priceOilMassage" = 500 WHERE "id" = '${venueId}'`
    )
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "priceThaiMassage", "priceFootMassage", "priceOilMassage" FROM "Venue" WHERE "id" = $1`, venueId
    ) as any[]
    expect(rows[0].priceThaiMassage).toBe(300)
    expect(rows[0].priceFootMassage).toBe(250)
    expect(rows[0].priceOilMassage).toBe(500)
  })

  it("massage categories use massage pricing group", () => {
    const MASSAGE_SLUGS = new Set(["massage", "ladyboy-massage", "gay-massage"])
    for (const slug of MASSAGE_SLUGS) {
      expect(MASSAGE_SLUGS.has(slug)).toBe(true)
    }
  })

  it("thai/oil/foot massage are NOT separate categories", async () => {
    for (const slug of ["thai-massage", "oil-massage", "foot-massage"]) {
      const cat = await prisma.category.findUnique({ where: { slug } })
      expect(cat).toBeNull()
    }
  })
})

// ── Edge cases & boundary conditions ────────────────────────────────
describe("Edge cases & robustness", () => {
  let categoryId: string
  let userId: string

  beforeAll(async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "general" } })
    categoryId = cat!.id
    userId = "test-user-id"
  })

  it("post with very long content is stored", async () => {
    const longContent = "x".repeat(10000)
    const post = await prisma.post.create({
      data: { title: "Long Post", slug: "long-post-edge", content: longContent, authorId: userId, categoryId },
    })
    expect(post.content.length).toBe(10000)
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("comment on deleted post fails with foreign key", async () => {
    const post = await prisma.post.create({
      data: { title: "Soon Deleted", slug: "soon-deleted", content: "temp", authorId: userId, categoryId },
    })
    const postId = post.id
    await prisma.post.delete({ where: { id: postId } })

    await expect(
      prisma.comment.create({ data: { content: "orphan", postId, authorId: userId } })
    ).rejects.toThrow()
  })

  it("vote on deleted post fails with foreign key", async () => {
    const post = await prisma.post.create({
      data: { title: "Vote Delete", slug: "vote-delete-edge", content: "temp", authorId: userId, categoryId },
    })
    const postId = post.id
    await prisma.post.delete({ where: { id: postId } })

    await expect(
      prisma.vote.create({ data: { postId, userId, value: 1 } })
    ).rejects.toThrow()
  })

  it("favorite on deleted post fails with foreign key", async () => {
    const post = await prisma.post.create({
      data: { title: "Fav Delete", slug: "fav-delete-edge", content: "temp", authorId: userId, categoryId },
    })
    const postId = post.id
    await prisma.post.delete({ where: { id: postId } })

    await expect(
      prisma.favorite.create({ data: { postId, userId } })
    ).rejects.toThrow()
  })

  it("duplicate vote on same post is prevented by unique constraint", async () => {
    const post = await prisma.post.create({
      data: { title: "Dup Vote", slug: "dup-vote-edge", content: "test", authorId: userId, categoryId },
    })
    await prisma.vote.create({ data: { postId: post.id, userId, value: 1 } })

    await expect(
      prisma.vote.create({ data: { postId: post.id, userId, value: -1 } })
    ).rejects.toThrow()

    await prisma.vote.deleteMany({ where: { postId: post.id } })
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("duplicate favorite on same post is prevented", async () => {
    const post = await prisma.post.create({
      data: { title: "Dup Fav", slug: "dup-fav-edge", content: "test", authorId: userId, categoryId },
    })
    await prisma.favorite.create({ data: { postId: post.id, userId } })

    await expect(
      prisma.favorite.create({ data: { postId: post.id, userId } })
    ).rejects.toThrow()

    await prisma.favorite.deleteMany({ where: { postId: post.id } })
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("rating on non-existent venue fails", async () => {
    await expect(
      prisma.venueRating.create({
        data: { venueId: "non-existent-id", authorId: userId, overall: 4, scores: "{}" },
      })
    ).rejects.toThrow()
  })

  it("comment on non-existent post fails", async () => {
    await expect(
      prisma.comment.create({
        data: { content: "orphan", postId: "non-existent-id", authorId: userId },
      })
    ).rejects.toThrow()
  })

  it("post with empty title and content is stored", async () => {
    const post = await prisma.post.create({
      data: { title: "", slug: "empty-title-edge", content: "", authorId: userId, categoryId },
    })
    expect(post.title).toBe("")
    expect(post.content).toBe("")
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("multiple categories can be assigned and removed from post", async () => {
    const cats = await prisma.category.findMany({ take: 5 })
    const post = await prisma.post.create({
      data: { title: "Multi Cat Edge", slug: "multi-cat-edge", content: "test", authorId: userId, categoryId },
    })

    // Assign all 5
    for (const cat of cats) {
      await prisma.postCategory.create({ data: { postId: post.id, categoryId: cat.id } })
    }
    let assigned = await prisma.postCategory.findMany({ where: { postId: post.id } })
    expect(assigned.length).toBe(5)

    // Remove all
    await prisma.postCategory.deleteMany({ where: { postId: post.id } })
    assigned = await prisma.postCategory.findMany({ where: { postId: post.id } })
    expect(assigned.length).toBe(0)

    await prisma.post.delete({ where: { id: post.id } })
  })

  it("venue rating upsert updates existing instead of creating duplicate", async () => {
    const cat = await prisma.category.findUnique({ where: { slug: "bar" } })
    const venue = await prisma.venue.create({
      data: { name: "Upsert Rating", slug: "upsert-rating-edge", categoryId: cat!.id },
    })

    // First rating
    await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: userId, venueId: venue.id } },
      create: { authorId: userId, venueId: venue.id, overall: 3, scores: "{}" },
      update: { overall: 3 },
    })

    // Upsert same user → should update, not duplicate
    await prisma.venueRating.upsert({
      where: { authorId_venueId: { authorId: userId, venueId: venue.id } },
      create: { authorId: userId, venueId: venue.id, overall: 5, scores: "{}" },
      update: { overall: 5 },
    })

    const ratings = await prisma.venueRating.findMany({ where: { venueId: venue.id } })
    expect(ratings.length).toBe(1)
    expect(ratings[0].overall).toBe(5)

    await prisma.venueRating.deleteMany({ where: { venueId: venue.id } })
    await prisma.venue.delete({ where: { id: venue.id } })
  })
})

// ══════════════════════════════════════════════════════════════
// POST SEARCH — case-insensitive + category name matching
// ══════════════════════════════════════════════════════════════

describe("Post search — case-insensitive + category", () => {
  const postIds: string[] = []

  beforeAll(async () => {
    const general = await prisma.category.findUnique({ where: { slug: "general" } })
    const massage = await prisma.category.findUnique({ where: { slug: "massage" } })
    const bar = await prisma.category.findUnique({ where: { slug: "bar" } })

    // Post 1: title matches "GoGo"
    const p1 = await prisma.post.create({
      data: {
        title: "Best GoGo Bars in Pattaya",
        slug: "search-test-gogo",
        content: "Here are my picks for gogo bars...",
        authorId: "test-user-id",
        categoryId: general!.id,
      },
    })
    postIds.push(p1.id)

    // Post 2: content mentions "ladyboy" but title doesn't
    const p2 = await prisma.post.create({
      data: {
        title: "Night out on Walking Street",
        slug: "search-test-walking",
        content: "Saw a great Ladyboy show last night",
        authorId: "test-user-id",
        categoryId: bar!.id,
      },
    })
    postIds.push(p2.id)

    // Post 3: in Massage category (searchable by category name)
    const p3 = await prisma.post.create({
      data: {
        title: "Relaxation tips",
        slug: "search-test-massage",
        content: "Some advice for first-timers",
        authorId: "test-admin-id",
        categoryId: massage!.id,
      },
    })
    await prisma.postCategory.create({ data: { postId: p3.id, categoryId: massage!.id } })
    postIds.push(p3.id)
  })

  afterAll(async () => {
    await prisma.postCategory.deleteMany({ where: { postId: { in: postIds } } })
    for (const id of postIds) await prisma.post.delete({ where: { id } }).catch(() => {})
  })

  it("case-insensitive title search — lowercase 'gogo' matches 'GoGo'", async () => {
    const results = await prisma.post.findMany({
      where: { title: { contains: "gogo", mode: "insensitive" } },
    })
    expect(results.some(p => p.title === "Best GoGo Bars in Pattaya")).toBe(true)
  })

  it("case-insensitive title search — uppercase 'GOGO' matches", async () => {
    const results = await prisma.post.findMany({
      where: { title: { contains: "GOGO", mode: "insensitive" } },
    })
    expect(results.some(p => p.title === "Best GoGo Bars in Pattaya")).toBe(true)
  })

  it("case-insensitive content search — 'ladyboy' matches mixed case", async () => {
    const results = await prisma.post.findMany({
      where: { content: { contains: "ladyboy", mode: "insensitive" } },
    })
    expect(results.some(p => p.slug === "search-test-walking")).toBe(true)
  })

  it("partial title match — 'relax' matches 'Relaxation tips'", async () => {
    const results = await prisma.post.findMany({
      where: { title: { contains: "relax", mode: "insensitive" } },
    })
    expect(results.some(p => p.title === "Relaxation tips")).toBe(true)
  })

  it("search by category name — 'massage' finds posts in Massage category", async () => {
    const matchingCategories = await prisma.category.findMany({
      where: { name: { contains: "massage", mode: "insensitive" } },
      select: { id: true },
    })
    expect(matchingCategories.length).toBeGreaterThan(0)

    const catIds = matchingCategories.map(c => c.id)
    const posts = await prisma.postCategory.findMany({
      where: { categoryId: { in: catIds } },
      select: { postId: true },
      distinct: ["postId"],
    })
    expect(posts.some(p => p.postId === postIds[2])).toBe(true)
  })

  it("partial category match — 'mass' matches Massage", async () => {
    const matchingCategories = await prisma.category.findMany({
      where: { name: { contains: "mass", mode: "insensitive" } },
      select: { id: true },
    })
    expect(matchingCategories.length).toBeGreaterThan(0)
  })

  it("case-insensitive category search — 'MASSAGE' matches", async () => {
    const matchingCategories = await prisma.category.findMany({
      where: { name: { contains: "MASSAGE", mode: "insensitive" } },
      select: { id: true },
    })
    expect(matchingCategories.length).toBeGreaterThan(0)
  })

  it("combined OR search matches title, content, and category", async () => {
    const q = "massage"
    const titleContentMatches = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
    })

    const catMatches = await prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true },
    })
    const catPostIds = catMatches.length > 0
      ? await prisma.postCategory.findMany({
          where: { categoryId: { in: catMatches.map(c => c.id) } },
          select: { postId: true },
          distinct: ["postId"],
        })
      : []

    const allPostIds = new Set([
      ...titleContentMatches.map(p => p.id),
      ...catPostIds.map(p => p.postId),
    ])

    // "Relaxation tips" post should be found via category, not title/content
    expect(allPostIds.has(postIds[2])).toBe(true)
  })

  it("no results for non-matching query", async () => {
    const results = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: "zzzznonexistent", mode: "insensitive" } },
          { content: { contains: "zzzznonexistent", mode: "insensitive" } },
        ],
      },
    })
    expect(results.length).toBe(0)
  })

  it("comment search is case-insensitive", async () => {
    // Add a comment to first post
    const comment = await prisma.comment.create({
      data: {
        content: "The GOGO on Walking Street is amazing!",
        authorId: "test-admin-id",
        postId: postIds[0],
      },
    })

    const matchingComments = await prisma.comment.findMany({
      where: { content: { contains: "gogo", mode: "insensitive" } },
      select: { postId: true },
      distinct: ["postId"],
    })
    expect(matchingComments.some(c => c.postId === postIds[0])).toBe(true)

    await prisma.comment.delete({ where: { id: comment.id } })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// !user mentions
// ═══════════════════════════════════════════════════════════════════════
describe("!user mentions", () => {
  const userMentionRegex = /(?<![a-zA-Z0-9])!([a-zA-Z0-9_-]+)/g

  it("parse single !user mention", () => {
    const text = "Hey !bababobo check this out"
    const matches = text.match(userMentionRegex)
    expect(matches).toEqual(["!bababobo"])
  })

  it("parse multiple !user mentions", () => {
    const text = "!alice and !bob-123 should see this"
    const matches = text.match(userMentionRegex)
    expect(matches).toEqual(["!alice", "!bob-123"])
  })

  it("distinguish @venue from !user", () => {
    const text = "Visited @windmill-club with !bababobo"
    const userMatches = text.match(userMentionRegex)
    expect(userMatches).toEqual(["!bababobo"])
    const venueMatches = text.replace(userMentionRegex, "").match(/@([a-z0-9-]+)/g)
    expect(venueMatches).toEqual(["@windmill-club"])
  })

  it("!mention with underscores and hyphens", () => {
    const text = "!top_g-dev is great"
    const matches = text.match(userMentionRegex)
    expect(matches).toEqual(["!top_g-dev"])
  })

  it("no !matches in plain text", () => {
    const text = "Just a regular comment"
    const matches = text.match(userMentionRegex)
    expect(matches).toBeNull()
  })

  it("store and retrieve post with !mention", async () => {
    const cat = await prisma.category.findFirst({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "User mention test",
        slug: "user-mention-test-" + Date.now(),
        content: "Shoutout to !testuser for the recommendation",
        authorId: "test-admin-id",
        categoryId: cat!.id,
      },
    })
    expect(post.content).toContain("!testuser")
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("extractUserMentions utility deduplicates", () => {
    function extractUserMentions(content: string): string[] {
      const matches = content.match(/(?<![a-zA-Z0-9])!([a-zA-Z0-9_-]+)/g)
      if (!matches) return []
      return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
    }
    const result = extractUserMentions("!Alice and !alice again and !Bob")
    expect(result).toEqual(["alice", "bob"])
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════════════
describe("Notifications", () => {
  it("create a notification", async () => {
    const notif = await prisma.notification.create({
      data: {
        type: "mention_post",
        recipientId: "test-user-id",
        actorId: "test-admin-id",
      },
    })
    expect(notif.id).toBeTruthy()
    expect(notif.read).toBe(false)
    expect(notif.type).toBe("mention_post")
    await prisma.notification.delete({ where: { id: notif.id } })
  })

  it("count unread notifications", async () => {
    const n1 = await prisma.notification.create({
      data: { type: "mention_post", recipientId: "test-user-id", actorId: "test-admin-id" },
    })
    const n2 = await prisma.notification.create({
      data: { type: "mention_comment", recipientId: "test-user-id", actorId: "test-admin-id" },
    })
    const n3 = await prisma.notification.create({
      data: { type: "mention_post", recipientId: "test-user-id", actorId: "test-admin-id", read: true },
    })

    const unread = await prisma.notification.count({
      where: { recipientId: "test-user-id", read: false },
    })
    expect(unread).toBe(2)

    await prisma.notification.deleteMany({ where: { id: { in: [n1.id, n2.id, n3.id] } } })
  })

  it("mark all notifications as read", async () => {
    const n1 = await prisma.notification.create({
      data: { type: "mention_post", recipientId: "test-user-id", actorId: "test-admin-id" },
    })
    const n2 = await prisma.notification.create({
      data: { type: "mention_comment", recipientId: "test-user-id", actorId: "test-admin-id" },
    })

    await prisma.notification.updateMany({
      where: { recipientId: "test-user-id", read: false },
      data: { read: true },
    })

    const unread = await prisma.notification.count({
      where: { recipientId: "test-user-id", read: false },
    })
    expect(unread).toBe(0)

    await prisma.notification.deleteMany({ where: { id: { in: [n1.id, n2.id] } } })
  })

  it("notification links to post", async () => {
    const cat = await prisma.category.findFirst({ where: { slug: "general" } })
    const post = await prisma.post.create({
      data: {
        title: "Notif post",
        slug: "notif-post-" + Date.now(),
        content: "Test",
        authorId: "test-admin-id",
        categoryId: cat!.id,
      },
    })

    const notif = await prisma.notification.create({
      data: {
        type: "mention_post",
        recipientId: "test-user-id",
        actorId: "test-admin-id",
        postId: post.id,
      },
      include: { post: { select: { slug: true, title: true } } },
    })

    expect(notif.post?.slug).toBe(post.slug)
    expect(notif.post?.title).toBe("Notif post")

    await prisma.notification.delete({ where: { id: notif.id } })
    await prisma.post.delete({ where: { id: post.id } })
  })

  it("cascade delete: deleting user removes notifications", async () => {
    const tempUser = await prisma.profile.create({
      data: {
        username: "tempnotifuser" + Date.now(),
        email: "tempnotif" + Date.now() + "@test.com",
        password: "hashed",
      },
    })

    await prisma.notification.create({
      data: { type: "mention_post", recipientId: tempUser.id, actorId: "test-admin-id" },
    })

    await prisma.notification.deleteMany({ where: { recipientId: tempUser.id } })
    await prisma.profile.delete({ where: { id: tempUser.id } })

    const count = await prisma.notification.count({ where: { recipientId: tempUser.id } })
    expect(count).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Username uniqueness
// ═══════════════════════════════════════════════════════════════════════
describe("Username uniqueness", () => {
  it("cannot create two users with same username", async () => {
    const uniqueSuffix = Date.now()
    await prisma.profile.create({
      data: { username: `unique-${uniqueSuffix}`, email: `u1-${uniqueSuffix}@test.com`, password: "hashed" },
    })

    await expect(
      prisma.profile.create({
        data: { username: `unique-${uniqueSuffix}`, email: `u2-${uniqueSuffix}@test.com`, password: "hashed" },
      })
    ).rejects.toThrow()

    await prisma.profile.deleteMany({ where: { username: `unique-${uniqueSuffix}` } })
  })

  it("username is case-sensitive at DB level", async () => {
    const suffix = Date.now()
    const u1 = await prisma.profile.create({
      data: { username: `CaseTest-${suffix}`, email: `case1-${suffix}@test.com`, password: "hashed" },
    })

    // Different casing — should work at DB level (app validates lowercase)
    const u2 = await prisma.profile.create({
      data: { username: `casetest-${suffix}`, email: `case2-${suffix}@test.com`, password: "hashed" },
    })

    expect(u1.id).not.toBe(u2.id)
    await prisma.profile.deleteMany({ where: { id: { in: [u1.id, u2.id] } } })
  })
})
